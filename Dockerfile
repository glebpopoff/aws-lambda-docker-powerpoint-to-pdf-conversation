FROM public.ecr.aws/shelf/lambda-libreoffice-base:7.4-node16-x86_64

COPY src/index.js ${LAMBDA_TASK_ROOT}/src/
COPY package.json ${LAMBDA_TASK_ROOT}/

RUN cd ${LAMBDA_TASK_ROOT} && npm install --production

CMD ["src/index.handler"]
