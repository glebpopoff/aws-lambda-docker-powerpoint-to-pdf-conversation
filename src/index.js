const AWS = require('aws-sdk');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const s3 = new AWS.S3();

exports.handler = async (event) => {
    try {
        // Get the S3 bucket and key from the event
        const bucket = event.Records[0].s3.bucket.name;
        const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
        
        if (!key.match(/\.(ppt|pptx)$/i)) {
            throw new Error('Input file must be a PowerPoint file (.ppt or .pptx)');
        }

        // Create temp directory
        const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ppt-'));
        const inputPath = path.join(tmpDir, 'input.pptx');
        const outputPath = path.join(tmpDir, 'output.pdf');

        try {
            // Download the PPT file from S3
            const inputData = await s3.getObject({ Bucket: bucket, Key: key }).promise();
            await fs.writeFile(inputPath, inputData.Body);

            // Convert PPT to PDF using LibreOffice
            const cmd = `cd ${tmpDir} && libreoffice7.4 --headless --invisible --nodefault --view --nolockcheck --nologo --norestore --convert-to pdf --outdir ${tmpDir} ${inputPath}`;
            console.log('Running command:', cmd);
            await execAsync(cmd);

            // The output file will have the same name as input but with .pdf extension
            const convertedPath = path.join(path.dirname(outputPath), path.basename(inputPath, path.extname(inputPath)) + '.pdf');
            
            // Read the converted PDF
            const pdfBuffer = await fs.readFile(convertedPath);

            // Upload the PDF to S3
            const outputKey = key.replace(/\.(ppt|pptx)$/i, '.pdf');
            await s3.putObject({
                Bucket: bucket,
                Key: outputKey,
                Body: pdfBuffer,
                ContentType: 'application/pdf'
            }).promise();

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Conversion successful',
                    input: key,
                    output: outputKey
                })
            };
        } finally {
            // Clean up temp directory
            await fs.remove(tmpDir);
        }
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};
