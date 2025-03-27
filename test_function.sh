aws lambda invoke \
    --function-name ppt-to-pdf-converter \
    --payload fileb://test-event.json \
    --cli-binary-format raw-in-base64-out \
    response.json \
    --profile openbook
