aws lambda create-function \
    --function-name ppt-to-pdf-converter-docker \
    --package-type Image \
    --code ImageUri=792621386145.dkr.ecr.us-east-1.amazonaws.com/ppt-to-pdf-converter:latest \
    --role arn:aws:iam::792621386145:role/lambda-ppt-to-pdf-role \
    --timeout 60 \
    --memory-size 1024 \
    --profile aws-profile-name
