https://medium.com/shelf-io-engineering/running-libreoffice-in-aws-lambda-2022-edition-open-sourced-9bb0028911d8

1. Buld Docker Image
2. Push to ECR
3. Deploy Lambda

aws ecr create-repository \
    --repository-name ppt-to-pdf-converter \
    --profile aws-profile-name

aws ecr get-login-password --region us-east-1 --profile aws-profile-name | docker login --username AWS --password-stdin 792621386145.dkr.ecr.us-east-1.amazonaws.com

docker build -t ppt-to-pdf-converter .


