import swaggerAutogen from 'swagger-autogen';

// const swaggerAutogen = swaggerAutogen();

const outputFile = './swagger_output.json'
const endpointsFiles = ['./index.js']

swaggerAutogen(outputFile, endpointsFiles)
