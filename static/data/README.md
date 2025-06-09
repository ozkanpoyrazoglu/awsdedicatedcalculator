# AWS Dedicated Host Data

This directory contains configuration files for AWS Dedicated Host specifications.

## Files

### `dedicated_hosts.json`
Complete AWS Dedicated Host capacity data based on the official AWS pricing table.

**Data Source:** https://aws.amazon.com/ec2/dedicated-hosts/pricing/

**Structure:**
```json
{
  "metadata": {
    "last_updated": "2025-01-20",
    "source": "AWS official documentation",
    "version": "1.0"
  },
  "instance_families": {
    "family_name": {
      "sockets": number,
      "total_cores": number,
      "core_per_size": {
        "size": cores_consumed
      }
    }
  }
}
```

## Updating Data

When AWS releases new instance types or updates existing ones:

1. Visit the AWS pricing page
2. Update the `dedicated_hosts.json` file
3. Increment the version number
4. Update the `last_updated` timestamp
5. Test the application

## Supported Instance Families

Current JSON includes **85+ instance families** with complete core allocation data:

- **Compute**: C3, C4, C5, C6, C7, C8 series
- **Memory**: R3, R4, R5, R6, R7, R8 series  
- **General**: M3, M4, M5, M6, M7, M8 series
- **Storage**: I2, I3, I4, I7, I8 series
- **GPU**: G2, G3, G4, G5, P2, P3, P4 series
- **High Memory**: U-series (6TB-32TB)
- **Specialized**: Mac, T3, X1, Z1, F1 series

## Core Calculation Examples

Based on AWS official examples:

**R5 Host (48 cores):**
- ✅ `4 × r5.4xlarge + 4 × r5.2xlarge = 32 + 16 = 48 cores`
- ✅ `1 × r5.12xlarge + 1 × r5.4xlarge + 5 × r5.xlarge + 2 × r5.large = 24 + 8 + 10 + 2 = 48 cores`

**C5 Host (36 cores):**
- ✅ `1 × c5.9xlarge + 2 × c5.4xlarge + 1 × c5.xlarge = 18 + 16 + 2 = 36 cores`
- ✅ `4 × c5.4xlarge + 1 × c5.xlarge + 2 × c5.large = 32 + 2 + 2 = 36 cores`

## Data Validation

The JSON data is validated against AWS official documentation to ensure:
- Correct core counts per instance family
- Accurate core consumption per instance size
- Proper socket and total core specifications
- Compatible with AWS mixed instance placement rules

## Future Updates

Monitor AWS announcements for:
- New instance generations (e.g., C9, M9, R9)
- Additional metal instance types
- Regional availability changes
- Pricing model updates