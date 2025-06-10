# AWS Dedicated Host Calculator

A professional web application for optimizing AWS EC2 instance allocation to Dedicated Hosts with cost analysis and reporting capabilities.

![AWS Dedicated Host Calculator](https://img.shields.io/badge/AWS-Dedicated%20Host%20Calculator-orange?style=for-the-badge&logo=amazonaws)
![Python](https://img.shields.io/badge/Python-3.8+-blue?style=for-the-badge&logo=python)
![Flask](https://img.shields.io/badge/Flask-2.3+-green?style=for-the-badge&logo=flask)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple?style=for-the-badge&logo=bootstrap)

## 🎯 Overview

The AWS Dedicated Host Calculator helps organizations optimize their AWS infrastructure by intelligently grouping EC2 instances onto Dedicated Hosts based on AWS's official capacity tables. It provides comprehensive cost analysis, utilization reports, and multiple export formats.

## ✨ Features

### 📊 **Core Functionality**
- **Smart Allocation**: Core-based optimal placement algorithm
- **Mixed Instance Support**: Different instance sizes on same host
- **Cost Analysis**: Monthly/annual cost estimation with savings plans
- **Real-time Validation**: Instance type support checking

### 📈 **Reporting & Analytics**
- **Executive Dashboard**: Live statistics and KPIs
- **Detailed Reports**: Host allocation breakdown
- **Multiple Exports**: Excel, PDF, PNG formats
- **Utilization Metrics**: Core usage and efficiency analysis

### 🔧 **Technical Features**
- **Web-based Interface**: No installation required
- **File Upload**: Excel/CSV import with drag & drop
- **Responsive Design**: Mobile and tablet friendly
- **Background Processing**: Non-blocking calculations
- **Session Management**: Multiple concurrent users

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/aws-dedicated-host-calculator.git
   cd aws-dedicated-host-calculator
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**
   ```bash
   python app.py
   ```

5. **Open in browser**
   ```
   http://localhost:5000
   ```

## 📋 Usage Guide

### Step 1: Prepare Your Data

Create an Excel or CSV file with the following columns:
- `Server Name` - Unique server identifier
- `Instance Type` - AWS EC2 instance type (e.g., m5.large, r5.xlarge)

**Example CSV:**
```csv
Server Name,Instance Type
WebServer-01,m5.large
WebServer-02,m5.large
DBServer-01,r5.xlarge
AppServer-01,c5.xlarge
```

### Step 2: Upload and Process

1. Open the web application
2. Drag & drop your file or click to browse
3. Review the data preview
4. Click "Start Grouping Calculation"

### Step 3: Analyze Results

The application provides:
- **Summary Statistics**: Total servers, required hosts, success rate
- **Cost Analysis**: Monthly costs and potential savings
- **Detailed Allocation**: Instance placement per host
- **Core Utilization**: Resource usage breakdown

### Step 4: Export Reports

Choose from multiple export formats:
- **📄 Excel**: Detailed data tables for analysis
- **📕 PDF**: Professional report for executives
- **🖼️ PNG**: Visual summary for presentations

## 🏗️ Supported Instance Types

The calculator supports **85+ AWS instance families** with complete core allocation data:

### **Compute Optimized**
| Family | Cores | Description | Supported Sizes |
|--------|--------|-------------|----------------|
| **C3-C8** | 20-192 | High-performance processors | nano to metal |
| **C6a/C6g/C7g** | 64-192 | AMD/Graviton processors | medium to metal |

### **Memory Optimized** 
| Family | Cores | Description | Supported Sizes |
|--------|--------|-------------|----------------|
| **R3-R8** | 20-192 | Memory-intensive applications | large to metal |
| **R6a/R6g/R7g** | 64-192 | AMD/Graviton memory optimized | medium to metal |

### **General Purpose**
| Family | Cores | Description | Supported Sizes |
|--------|--------|-------------|----------------|
| **M3-M8** | 20-192 | Balanced compute/memory | medium to metal |
| **M6a/M6g/M7g** | 64-192 | AMD/Graviton general purpose | medium to metal |

### **Storage Optimized**
| Family | Cores | Description | Supported Sizes |
|--------|--------|-------------|----------------|
| **I2-I8** | 20-192 | High I/O performance | large to metal |
| **D2** | 24 | Dense HDD storage | xlarge to 8xlarge |

### **Accelerated Computing**
| Family | Cores | Description | Supported Sizes |
|--------|--------|-------------|----------------|
| **G2-G5** | 16-96 | Graphics workloads | 2xlarge to metal |
| **P2-P4** | 36-96 | Machine learning | xlarge to 24xlarge |
| **F1** | 16 | FPGA development | 16xlarge |

### **High Memory**
| Family | Cores | Description | Supported Sizes |
|--------|--------|-------------|----------------|
| **U-series** | 224-448 | 6TB to 32TB memory | 112xlarge to metal |
| **X1/X2** | 24-72 | High memory applications | xlarge to metal |

### **Specialized**
| Family | Cores | Description | Supported Sizes |
|--------|--------|-------------|----------------|
| **T3** | 48 | Burstable performance | nano to 2xlarge |
| **Mac1/Mac2** | 6-8 | macOS workloads | metal |
| **Z1d** | 24 | High frequency | large to 12xlarge |

*Complete list available via API: `GET /api/supported-families`*

## 💡 Algorithm Details

### Core-Based Allocation

The calculator uses AWS's official core allocation method:

**Example for R5 Dedicated Host (48 cores):**
- ✅ `4 × r5.4xlarge + 4 × r5.2xlarge = 32 + 16 = 48 cores`
- ✅ `1 × r5.12xlarge + 1 × r5.4xlarge + 5 × r5.xlarge + 2 × r5.large = 24 + 8 + 10 + 2 = 48 cores`

### Optimization Strategy

1. **Greedy Allocation**: Larger instances placed first
2. **Core Awareness**: Never exceeds total core capacity
3. **Mixed Support**: Different sizes on same host
4. **Minimal Hosts**: Optimizes for cost efficiency

## 🔧 Configuration

### Environment Variables

```bash
# Optional configurations
FLASK_ENV=production
FLASK_DEBUG=False
MAX_CONTENT_LENGTH=16777216  # 16MB
UPLOAD_FOLDER=uploads
```

### Updating Instance Types

To add or update AWS instance families:

1. **Edit JSON data file:**
   ```bash
   nano static/data/dedicated_hosts.json
   ```

2. **Add new instance family:**
   ```json
   "new_family": {
     "sockets": 2, 
     "total_cores": 64,
     "core_per_size": {
       "large": 2, 
       "xlarge": 4, 
       "2xlarge": 8
     }
   }
   ```

3. **Update metadata:**
   ```json
   "metadata": {
     "last_updated": "2025-01-21",
     "version": "1.1"
   }
   ```

4. **Restart application:**
   ```bash
   python app.py
   ```

### Data Validation

The application automatically validates JSON data on startup:
- ✅ Logs loaded instance families count
- ✅ Shows data version and update date  
- ⚠️ Falls back to minimal data if JSON is invalid
- 🔄 Provides fallback data for basic functionality

### Monitoring Data Updates

Check application logs for data loading status:
```
✅ Loaded 85 instance families from static/data/dedicated_hosts.json
📅 Data version: 1.0
🔄 Last updated: 2025-01-20
```

## 📊 Cost Estimates

The calculator provides rough cost estimates based on:
- **On-Demand**: ~$2,500/month per host
- **Reserved (1-year)**: 50% savings
- **Reserved (3-year)**: 70% savings
- **Savings Plans**: 65% savings

*For accurate pricing, consult AWS Pricing Calculator*

## 🛠️ Development

### Project Structure

```
aws-dedicated-host-calculator/
├── README.md
├── requirements.txt
├── .gitignore
├── app.py                          # Flask backend application
├── static/
│   ├── css/
│   │   └── style.css              # Custom styles & animations
│   ├── js/
│   │   └── main.js                # Frontend JavaScript logic
│   ├── data/
│   │   ├── dedicated_hosts.json   # AWS instance family data
│   │   └── README.md              # Data documentation
│   └── favicon.ico                # Website icon
├── templates/
│   └── index.html                 # Main HTML template
└── uploads/
    └── .gitkeep                   # Keep directory in git
```

### API Endpoints

- `GET /` - Main application page
- `POST /upload` - File upload and processing
- `POST /calculate` - Start calculation
- `GET /status/<session_id>` - Check calculation status
- `GET /results/<session_id>` - Get calculation results
- `GET /export/<session_id>` - Download Excel report
- `GET /api/supported-families` - Get supported instance families info

### REST API Usage

```bash
# Get supported instance families
curl http://localhost:5000/api/supported-families

# Response includes metadata and family specifications
{
  "success": true,
  "metadata": {
    "version": "1.0",
    "last_updated": "2025-01-20"
  },
  "total_families": 85,
  "families": {
    "m5": {
      "total_cores": 48,
      "sockets": 2,
      "supported_sizes": ["large", "xlarge", "2xlarge", ...],
      "size_count": 9
    }
  }
}
```

### Adding New Features

1. **Backend**: Modify `app.py` for new calculations
2. **Frontend**: Update `static/js/main.js` for UI features
3. **Styling**: Customize `static/css/style.css`
4. **Templates**: Edit `templates/index.html` for layout changes

## 🐳 Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 5000
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

Build and run:
```bash
docker build -t aws-calculator .
docker run -p 5000:5000 aws-calculator
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- **Linkedin**: https://www.linkedin.com/in/ozkanpoyrazoglu/

## 🚀 Roadmap

- [x] **Complete AWS Instance Coverage** - 85+ families supported
- [x] **External JSON Configuration** - Easy updates without code changes
- [x] **REST API** - Programmatic access to supported families
- [ ] Multi-region support with regional pricing
- [ ] Reserved Instance recommendations
- [ ] Cost optimization suggestions with RI/SP analysis
- [ ] Terraform/CloudFormation export
- [ ] Automated JSON updates from AWS API
- [ ] Dashboard analytics and historical tracking
- [ ] Integration with AWS Cost Explorer
- [ ] Custom pricing model support

## ⭐ Acknowledgments

- AWS Official Documentation for Dedicated Host specifications
- Bootstrap team for responsive design framework
- Flask community for the excellent web framework

---

**Made with ❤️ for AWS Infrastructure Optimization**