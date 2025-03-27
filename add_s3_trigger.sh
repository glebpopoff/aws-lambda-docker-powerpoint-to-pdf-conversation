aws lambda add-permission \
    --function-name ppt-to-pdf-converter \
    --statement-id S3InvokeFunction \
    --action lambda:InvokeFunction \
    --principal s3.amazonaws.com \
    --source-arn arn:aws:s3:::poc-ppt-to-pdf-demo \
    --profile aws-profile-name
