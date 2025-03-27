# PowerPoint to PDF Converter - AWS Lambda

This project implements an AWS Lambda function that automatically converts PowerPoint (PPT/PPTX) files to PDF format using LibreOffice. The function is triggered when a PowerPoint file is uploaded to an S3 bucket, converts it to PDF, and stores the result back in the same bucket.

## Architecture

The solution uses:
- AWS Lambda with Docker container runtime
- LibreOffice for file conversion
- Amazon S3 for file storage
- Amazon ECR for container image storage

## Prerequisites

- AWS CLI configured with appropriate credentials
- Docker installed and running
- Node.js 16.x or later
- An AWS S3 bucket for storing files
- AWS IAM role with appropriate permissions (see IAM Role section)

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/lambda-ppt-to-pdf-converter.git
cd lambda-ppt-to-pdf-converter
```

2. Install dependencies:
```bash
npm install
```

3. Build and push the Docker image:
```bash
# Build the image
docker buildx build --platform linux/amd64 -t ppt-to-pdf-converter --load .

# Create ECR repository (if not exists)
aws ecr create-repository --repository-name ppt-to-pdf-converter

# Log in to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$(aws configure get region).amazonaws.com

# Tag and push the image
docker tag ppt-to-pdf-converter:latest $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$(aws configure get region).amazonaws.com/ppt-to-pdf-converter:latest
docker push $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$(aws configure get region).amazonaws.com/ppt-to-pdf-converter:latest
```

4. Create the Lambda function:
```bash
aws lambda create-function \
    --function-name ppt-to-pdf-converter-docker \
    --package-type Image \
    --code ImageUri=$(aws sts get-caller-identity --query Account --output text).dkr.ecr.$(aws configure get region).amazonaws.com/ppt-to-pdf-converter:latest \
    --role arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/lambda-ppt-to-pdf-role \
    --timeout 60 \
    --memory-size 1024
```

5. Configure S3 trigger:
   - Go to AWS Lambda console
   - Select your function
   - Add trigger
   - Select S3
   - Choose your bucket
   - Set Event type to "All object create events"
   - Optional: Add a prefix filter for PPT/PPTX files

## IAM Role

The Lambda function requires an IAM role with the following permissions:
- AWSLambdaBasicExecutionRole (for CloudWatch Logs)
- S3 bucket access:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject"
            ],
            "Resource": [
                "arn:aws:s3:::your-bucket-name/*"
            ]
        }
    ]
}
```

## How It Works

1. When a PPT/PPTX file is uploaded to the S3 bucket, it triggers the Lambda function
2. The function downloads the file to a temporary directory
3. LibreOffice (running in headless mode) converts the file to PDF
4. The resulting PDF is uploaded back to the S3 bucket
5. The temporary files are cleaned up

## File Naming

- Input files must have `.ppt` or `.pptx` extension
- Output PDF files will have the same name as the input file but with `.pdf` extension
- Example: `presentation.pptx` → `presentation.pdf`

## Docker and ECR Setup

### Docker Configuration

1. Create a Dockerfile:
```dockerfile
FROM public.ecr.aws/shelf/lambda-libreoffice-base:7.4-node16-x86_64
COPY src/index.js ${LAMBDA_TASK_ROOT}/src/
COPY package.json ${LAMBDA_TASK_ROOT}/
CMD ["src/index.handler"]
```

2. Set up Docker buildx for multi-platform builds:
```bash
# Create a new builder instance
docker buildx create --use

# Build for AMD64 (Lambda's architecture)
docker buildx build --platform linux/amd64 -t ppt-to-pdf-converter --load .
```

### Amazon ECR Setup

1. Create an ECR repository:
```bash
aws ecr create-repository \
    --repository-name ppt-to-pdf-converter \
    --image-scanning-configuration scanOnPush=true
```

2. Authenticate Docker to ECR:
```bash
# Get AWS account ID
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=$(aws configure get region)

# Log in to ECR
aws ecr get-login-password | \
    docker login --username AWS --password-stdin \
    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
```

3. Tag and push the image:
```bash
# Tag the image
docker tag ppt-to-pdf-converter:latest \
    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ppt-to-pdf-converter:latest

# Push to ECR
docker push \
    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ppt-to-pdf-converter:latest
```

### Common Docker/ECR Issues and Solutions

1. **Platform Mismatch**
   - Error: "no matching manifest for linux/arm64/v8 in the manifest list entries"
   - Solution: Use `--platform linux/amd64` with Docker buildx to build for Lambda's architecture

2. **ECR Authentication**
   - Error: "no basic auth credentials"
   - Solution: Re-run the ECR login command (credentials expire after 12 hours)

3. **Image Size**
   - Issue: Large image size due to LibreOffice
   - Solution: Using the pre-built base image from Shelf.io significantly reduces size and build time

4. **Cold Start**
   - Issue: First invocation takes longer
   - Solution: Consider using provisioned concurrency if faster cold starts are needed

### Docker Development Tips

1. Local Testing:
```bash
# Build locally
docker build -t ppt-to-pdf-converter .

# Test conversion locally
docker run -v $(pwd)/test:/tmp ppt-to-pdf-converter \
    libreoffice7.4 --headless --convert-to pdf \
    --outdir /tmp /tmp/test.pptx
```

2. Debugging the Container:
```bash
# Run container interactively
docker run -it ppt-to-pdf-converter /bin/bash

# Check LibreOffice installation
libreoffice7.4 --version

# Verify Node.js environment
node --version
```

3. Optimizing the Image:
- Use `.dockerignore` to exclude unnecessary files
- Layer caching for faster builds
- Multi-stage builds if needed

### Updating the Lambda Function

After making changes to the code:

1. Rebuild the Docker image:
```bash
docker buildx build --platform linux/amd64 -t ppt-to-pdf-converter --load .
```

2. Push the new version:
```bash
docker tag ppt-to-pdf-converter:latest \
    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ppt-to-pdf-converter:latest
docker push \
    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ppt-to-pdf-converter:latest
```

3. Update the Lambda function:
```bash
aws lambda update-function-code \
    --function-name ppt-to-pdf-converter-docker \
    --image-uri ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ppt-to-pdf-converter:latest
```

### Base Image Details

We use `public.ecr.aws/shelf/lambda-libreoffice-base:7.4-node16-x86_64` which provides:
- Amazon Linux 2 base
- Node.js 16.x runtime
- LibreOffice 7.4 with headless support
- Common fonts and dependencies
- Lambda-optimized configuration

Benefits of using this base image:
- Pre-configured for AWS Lambda
- Optimized for performance
- Includes all necessary LibreOffice dependencies
- Regular security updates
- Smaller than building from scratch

## Docker Image

The function uses a Docker image based on the LibreOffice Lambda base image from Shelf.io. The image includes:
- Node.js 16.x runtime
- LibreOffice 7.4
- CJK fonts support
- All necessary dependencies for PDF conversion

## Limitations

- Maximum file size is limited by Lambda's `/tmp` directory space (10GB max)
- Function timeout is set to 60 seconds
- Memory is set to 1024MB (can be increased if needed)
- Input files must be PPT or PPTX format

## Troubleshooting

### Common Issues

1. **Function times out**
   - Increase the function timeout in Lambda settings
   - Consider increasing memory allocation

2. **File too large**
   - Increase Lambda's ephemeral storage (/tmp)
   - Split large presentations into smaller files

3. **Conversion fails**
   - Check CloudWatch logs for detailed error messages
   - Verify input file format and integrity

### Viewing Logs

```bash
# Get log streams
aws logs describe-log-streams \
    --log-group-name /aws/lambda/ppt-to-pdf-converter-docker \
    --order-by LastEventTime \
    --descending

# View specific log stream
aws logs get-log-events \
    --log-group-name /aws/lambda/ppt-to-pdf-converter-docker \
    --log-stream-name "STREAM_NAME"
```

## Development

### Project Structure

```
.
├── src/
│   └── index.js          # Lambda function code
├── Dockerfile            # Docker image definition
├── package.json          # Node.js dependencies
└── README.md            # This file
```

### Local Testing

1. Build and run the container locally:
```bash
docker build -t ppt-to-pdf-converter .
docker run -v $(pwd)/test:/tmp ppt-to-pdf-converter libreoffice7.4 --headless --convert-to pdf --outdir /tmp /tmp/test.pptx
```

## Inspiration
https://medium.com/shelf-io-engineering/running-libreoffice-in-aws-lambda-2022-edition-open-sourced-9bb0028911d8

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
