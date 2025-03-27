# Lambda PPT to PDF Converter

This AWS Lambda function automatically converts PowerPoint files (PPT/PPTX) to PDF format when they are uploaded to an S3 bucket.

## Prerequisites

1. AWS CLI installed and configured
2. Node.js installed
3. LibreOffice installed on the Lambda layer (see deployment instructions)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create an AWS Lambda function:
   ```bash
   aws lambda create-function \
     --function-name ppt-to-pdf-converter \
     --runtime nodejs18.x \
     --handler src/index.handler \
     --role arn:aws:iam::[YOUR-ACCOUNT-ID]:role/[YOUR-LAMBDA-ROLE] \
     --timeout 30 \
     --memory-size 512
   ```

3. Create a Lambda layer with LibreOffice:
   - Create a layer with LibreOffice binaries compatible with Lambda
   - Attach the layer to your function

4. Configure S3 trigger:
   - Create an S3 bucket or use existing one
   - Add S3 trigger to Lambda for PPT/PPTX file uploads

## Deployment

Build and deploy the function:
```bash
npm run build
npm run deploy
```

## Usage

1. Upload a PPT/PPTX file to the configured S3 bucket
2. The Lambda function will automatically convert it to PDF
3. The PDF will be saved in the same bucket with the same name but .pdf extension

## Testing

Test the function by uploading a PPT file to your S3 bucket:
```bash
aws s3 cp test.pptx s3://poc-ppt-to-pdf-demo/test.pptx
```

Check the conversion result:
```bash
aws s3 ls s3://poc-ppt-to-pdf-demo/test.pdf
```
