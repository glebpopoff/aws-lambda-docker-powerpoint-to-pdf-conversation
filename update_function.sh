aws lambda update-function-code \
    --function-name ppt-to-pdf-converter \
    --zip-file fileb://dist/function.zip \
    --profile openbook
