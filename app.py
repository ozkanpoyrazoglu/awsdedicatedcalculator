#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AWS Dedicated Host Calculator - Flask Backend
Main application file for the web server
"""

from flask import Flask, render_template, request, jsonify, send_file
import pandas as pd
import json
import os
import uuid
from collections import defaultdict
from datetime import datetime
import io
import threading
import time

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'

# Create upload directory if it doesn't exist
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# Global variables for session management
processing_status = {}
calculation_results = {}

class AWSCalculator:
    def __init__(self):
        """Initialize calculator with AWS Dedicated Host data from JSON file"""
        self.load_dedicated_host_data()
    
    def load_dedicated_host_data(self):
        """Load dedicated host capacities from external JSON file"""
        try:
            json_path = os.path.join('static', 'data', 'dedicated_hosts.json')
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            self.dedicated_host_capacities = data['instance_families']
            self.metadata = data.get('metadata', {})
            
            print(f"✅ Loaded {len(self.dedicated_host_capacities)} instance families from {json_path}")
            print(f"📅 Data version: {self.metadata.get('version', 'Unknown')}")
            print(f"🔄 Last updated: {self.metadata.get('last_updated', 'Unknown')}")
            
        except FileNotFoundError:
            print("❌ ERROR: dedicated_hosts.json file not found!")
            print("📁 Expected location: static/data/dedicated_hosts.json")
            # Fallback to minimal data
            self.dedicated_host_capacities = self._get_fallback_data()
            self.metadata = {"version": "fallback", "last_updated": "unknown"}
            
        except json.JSONDecodeError as e:
            print(f"❌ ERROR: Invalid JSON format: {e}")
            self.dedicated_host_capacities = self._get_fallback_data()
            self.metadata = {"version": "fallback", "last_updated": "unknown"}
    
    def _get_fallback_data(self):
        """Fallback data in case JSON file is not available"""
        return {
            'm5': {
                'sockets': 2, 'total_cores': 48,
                'core_per_size': {'large': 1, 'xlarge': 2, '2xlarge': 4, '4xlarge': 8, '8xlarge': 16, '12xlarge': 24, '16xlarge': 32, '24xlarge': 48, 'metal': 48}
            },
            'r5': {
                'sockets': 2, 'total_cores': 48,
                'core_per_size': {'large': 1, 'xlarge': 2, '2xlarge': 4, '4xlarge': 8, '8xlarge': 16, '12xlarge': 24, '16xlarge': 32, '24xlarge': 48, 'metal': 48}
            },
            'c5': {
                'sockets': 2, 'total_cores': 36,
                'core_per_size': {'large': 1, 'xlarge': 2, '2xlarge': 4.5, '4xlarge': 9, '9xlarge': 18, '18xlarge': 36}
            }
        }
    
    def get_supported_families(self):
        """Get list of supported instance families"""
        return list(self.dedicated_host_capacities.keys())
    
    def get_family_info(self, family):
        """Get detailed information about an instance family"""
        return self.dedicated_host_capacities.get(family, None)
    
    def parse_instance_type(self, instance_type):
        """Parse instance type into family and size"""
        instance_type = instance_type.lower().strip()
        
        if '.metal' in instance_type:
            family = instance_type.split('.')[0]
            size = 'metal'
            if '-' in instance_type:
                size = instance_type.split('.')[1]
        else:
            parts = instance_type.split('.')
            if len(parts) >= 2:
                family = parts[0]
                size = parts[1]
            else:
                return None, None
        
        return family, size
    
    def get_size_priority(self, size):
        """Get priority value for instance size (larger = higher priority)"""
        size_priorities = {
            'metal': 1000, 'metal-48xl': 999, 'metal-32xl': 998, 'metal-24xl': 997, 'metal-16xl': 996,
            '224xlarge': 224, '112xlarge': 112, '48xlarge': 48, '32xlarge': 32, '24xlarge': 24, 
            '18xlarge': 18, '16xlarge': 16, '12xlarge': 12, '10xlarge': 10, '9xlarge': 9, 
            '8xlarge': 8, '6xlarge': 6, '4xlarge': 4, '3xlarge': 3, '2xlarge': 2, 'xlarge': 1,
            'large': 0.5, 'medium': 0.25, 'small': 0.1, 'micro': 0.05, 'nano': 0.01
        }
        return size_priorities.get(size, 0)
    
    def optimize_family_allocation(self, family, instances):
        """Optimize Dedicated Host allocation for a family (Core-based)"""
        family_config = self.dedicated_host_capacities[family]
        total_cores = family_config['total_cores']
        core_per_size = family_config['core_per_size']
        
        # Group instances by size and count them
        size_counts = defaultdict(int)
        instance_mapping = defaultdict(list)
        
        for instance in instances:
            size_counts[instance['size']] += 1
            instance_mapping[instance['size']].append(instance)
        
        hosts = []
        host_id = 1
        
        # Sort by core consumption (greedy approach)
        sizes_by_core_consumption = sorted(size_counts.keys(), 
                                         key=lambda x: core_per_size.get(x, 0), 
                                         reverse=True)
        
        remaining_counts = size_counts.copy()
        
        while any(count > 0 for count in remaining_counts.values()):
            # Create new host
            current_host = {
                'host_id': f"{family.upper()}-DH-{host_id:03d}",
                'family': family,
                'sockets': family_config['sockets'],
                'total_cores': total_cores,
                'used_cores': 0,
                'instances': [],
                'utilization': {},
                'core_breakdown': {}
            }
            
            # Place instances based on core capacity
            for size in sizes_by_core_consumption:
                if remaining_counts[size] > 0:
                    core_per_instance = core_per_size[size]
                    available_cores = total_cores - current_host['used_cores']
                    
                    # How many instances of this size can fit?
                    max_instances_by_cores = int(available_cores // core_per_instance)
                    instances_to_allocate = min(remaining_counts[size], max_instances_by_cores)
                    
                    if instances_to_allocate > 0:
                        # Add instances
                        current_host['instances'].extend(instance_mapping[size][:instances_to_allocate])
                        current_host['utilization'][size] = instances_to_allocate
                        current_host['core_breakdown'][size] = instances_to_allocate * core_per_instance
                        current_host['used_cores'] += instances_to_allocate * core_per_instance
                        
                        # Update remaining counts
                        remaining_counts[size] -= instances_to_allocate
                        instance_mapping[size] = instance_mapping[size][instances_to_allocate:]
            
            # Only add host if it has instances
            if current_host['instances']:
                hosts.append(current_host)
                host_id += 1
            else:
                # If no instances could be placed, break to avoid infinite loop
                break
        
        return hosts
    
    def calculate_grouping(self, instances_data, session_id):
        """Main calculation function"""
        try:
            processing_status[session_id] = {"status": "processing", "progress": 10}
            
            family_groups = defaultdict(list)
            unsupported_instances = []
            
            for instance in instances_data:
                family, size = self.parse_instance_type(instance['type'])
                
                if family and family in self.dedicated_host_capacities:
                    if size in self.dedicated_host_capacities[family]['core_per_size']:
                        family_groups[family].append({
                            'name': instance['name'],
                            'type': instance['type'],
                            'size': size
                        })
                    else:
                        unsupported_instances.append(instance)
                else:
                    unsupported_instances.append(instance)
            
            processing_status[session_id]["progress"] = 50
            
            host_allocations = []
            total_hosts = 0
            
            for family, instances in family_groups.items():
                family_hosts = self.optimize_family_allocation(family, instances)
                host_allocations.extend(family_hosts)
                total_hosts += len(family_hosts)
            
            processing_status[session_id]["progress"] = 90
            
            results = {
                'host_allocations': host_allocations,
                'unsupported_instances': unsupported_instances,
                'total_hosts': total_hosts,
                'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                'summary': {
                    'total_servers': len(instances_data),
                    'supported_servers': len(instances_data) - len(unsupported_instances),
                    'success_rate': ((len(instances_data) - len(unsupported_instances)) / len(instances_data) * 100) if instances_data else 0,
                    'monthly_cost': total_hosts * 2500,
                    'annual_cost': total_hosts * 30000,
                    'reserved_savings': int(total_hosts * 30000 * 0.7)
                }
            }
            
            calculation_results[session_id] = results
            processing_status[session_id] = {"status": "completed", "progress": 100}
            
            return results
            
        except Exception as e:
            processing_status[session_id] = {"status": "error", "error": str(e)}
            return None

# Initialize calculator
calculator = AWSCalculator()

@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    """File upload endpoint"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file found'})
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'})
        
        # Generate session ID
        session_id = str(uuid.uuid4())
        
        # Read file
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file)
        
        # Normalize column names
        df.columns = df.columns.str.strip().str.lower()
        
        # Find name and type columns
        name_columns = [col for col in df.columns if any(keyword in col for keyword in ['name', 'server', 'host', 'sunucu', 'ad'])]
        type_columns = [col for col in df.columns if any(keyword in col for keyword in ['type', 'instance', 'tip'])]
        
        if not name_columns or not type_columns:
            return jsonify({'success': False, 'error': 'Required columns not found (name/server and type/instance)'})
        
        name_col = name_columns[0]
        type_col = type_columns[0]
        
        # Process data
        instances_data = []
        for _, row in df.iterrows():
            if pd.notna(row[name_col]) and pd.notna(row[type_col]):
                instance_type = str(row[type_col]).strip()
                family, size = calculator.parse_instance_type(instance_type)
                
                status = "✅ Supported"
                if not family or family not in calculator.dedicated_host_capacities:
                    status = "❌ Unsupported"
                elif size not in calculator.dedicated_host_capacities.get(family, {}).get('core_per_size', {}):
                    status = "⚠️ Size unsupported"
                
                instances_data.append({
                    'name': str(row[name_col]).strip(),
                    'type': instance_type,
                    'status': status
                })
        
        # Store data in memory (in production, use Redis or database)
        global calculation_results
        calculation_results[session_id] = {'instances_data': instances_data}
        
        # Calculate stats
        total = len(instances_data)
        supported = sum(1 for i in instances_data if '✅' in i['status'])
        unsupported = total - supported
        
        # Create preview (first 10 records)
        preview = instances_data[:10]
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'record_count': total,
            'data': instances_data,
            'preview': preview,
            'stats': {
                'total': total,
                'supported': supported,
                'unsupported': unsupported
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/calculate', methods=['POST'])
def calculate():
    """Start calculation endpoint"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        
        if not session_id or session_id not in calculation_results:
            return jsonify({'success': False, 'error': 'Invalid session ID'})
        
        instances_data = calculation_results[session_id]['instances_data']
        
        # Start calculation in background thread
        thread = threading.Thread(target=calculator.calculate_grouping, args=(instances_data, session_id))
        thread.daemon = True
        thread.start()
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/status/<session_id>')
def get_status(session_id):
    """Check calculation status"""
    status = processing_status.get(session_id, {"status": "not_found"})
    return jsonify(status)

@app.route('/results/<session_id>')
def get_results(session_id):
    """Get calculation results"""
    try:
        if session_id not in calculation_results:
            return jsonify({'success': False, 'error': 'Results not found'})
        
        results = calculation_results[session_id]
        if 'host_allocations' not in results:
            return jsonify({'success': False, 'error': 'Calculation not completed yet'})
        
        return jsonify({'success': True, 'results': results})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/export/<session_id>')
def export_results(session_id):
    """Excel export"""
    try:
        if session_id not in calculation_results:
            return "Results not found", 404
        
        results = calculation_results[session_id]
        if 'host_allocations' not in results:
            return "Calculation not completed", 400
        
        # Create Excel file in memory
        output = io.BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Executive Summary
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            summary_data = {
                'Metric': [
                    'Report Date',
                    'Total Servers',
                    'Grouped Servers', 
                    'Required Dedicated Hosts',
                    'Unsupported Instances',
                    'Success Rate (%)',
                    'Estimated Monthly Cost (USD)',
                    'Estimated Annual Cost (USD)',
                    'Reserved Savings (USD)'
                ],
                'Value': [
                    timestamp,
                    results['summary']['total_servers'],
                    results['summary']['supported_servers'],
                    results['total_hosts'],
                    len(results['unsupported_instances']),
                    f"{results['summary']['success_rate']:.1f}%",
                    f"${results['summary']['monthly_cost']:,}",
                    f"${results['summary']['annual_cost']:,}",
                    f"${results['summary']['reserved_savings']:,}"
                ]
            }
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, sheet_name='Executive Summary', index=False)
            
            # Host Details
            host_details = []
            for host in results['host_allocations']:
                for instance in host['instances']:
                    host_details.append({
                        'Host ID': host['host_id'],
                        'Instance Family': host['family'].upper(),
                        'Sockets': host['sockets'],
                        'Total Cores': host['total_cores'],
                        'Used Cores': host.get('used_cores', 0),
                        'Core Utilization (%)': f"{(host.get('used_cores', 0) / host['total_cores'] * 100):.1f}%",
                        'Server Name': instance['name'],
                        'Instance Type': instance['type'],
                        'Instance Size': instance['size']
                    })
            
            if host_details:
                host_df = pd.DataFrame(host_details)
                host_df.to_excel(writer, sheet_name='Host Details', index=False)
            
            # Unsupported Instances
            if results['unsupported_instances']:
                unsupported_df = pd.DataFrame(results['unsupported_instances'])
                unsupported_df.to_excel(writer, sheet_name='Unsupported Instances', index=False)
        
        output.seek(0)
        
        return send_file(
            output,
            as_attachment=True,
            download_name=f'aws_dedicated_hosts_report_{session_id[:8]}.xlsx',
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
    except Exception as e:
        return f"Export error: {str(e)}", 500

@app.route('/api/supported-families')
def get_supported_families():
    """API endpoint to get supported instance families"""
    try:
        families = calculator.get_supported_families()
        family_info = {}
        
        for family in families:
            info = calculator.get_family_info(family)
            family_info[family] = {
                'total_cores': info['total_cores'],
                'sockets': info['sockets'],
                'supported_sizes': list(info['core_per_size'].keys()),
                'size_count': len(info['core_per_size'])
            }
        
        return jsonify({
            'success': True,
            'metadata': calculator.metadata,
            'total_families': len(families),
            'families': family_info
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)