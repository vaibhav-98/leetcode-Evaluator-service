
// import Docker from 'dockerode';
// import { TestCase } from '../types/testCases';

import { JAVA_IMAGE } from '../utils/constants';
import createContainer from './containerFactory';
import decodeDockerStream from './dockerHelper';
import pullImage from './pullImage';

async function runJava(code: string, inputTestCase: string) {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rowLogBuffer: Buffer[] = [] ;
   
    console.log("Initialising a new java docker container");

    await pullImage(JAVA_IMAGE)
    
    const runCommand = `echo '${code.replace(/'/g, `'\\"`)}' > Main.java && javac Main.java && echo '${inputTestCase.replace(/'/g, `'\\"`)}' | java Main`;

    //console.log("run commond >>",runCommand);
    
    const javaDockerContainer = await createContainer(JAVA_IMAGE, [
        '/bin/sh', 
        '-c',
        runCommand
    ]); 
    // starting / booting the corresponding docker container 
    await javaDockerContainer.start();

    console.log("Started the docker container");

    const loggerStram = await javaDockerContainer.logs({
          stdout: true,
          stderr: true,
          timestamps: false,
          follow: true, // whether the logs are streamed or returned as a string
    });

    // Attach events on the stream objects to start and stop reading
    loggerStram.on('data', (chunk) => {
        rowLogBuffer.push(chunk);
    });
     

    await new Promise( (res) => {
        loggerStram.on('end', () => {
            console.log(rowLogBuffer);
            const completeBuffer = Buffer.concat(rowLogBuffer);
            const decodeStream = decodeDockerStream(completeBuffer);
            console.log(decodeStream);
            console.log(decodeStream.stdout);
            res(decodeDockerStream);
            
        });
    });
   
       // remove the container when done with it
       await javaDockerContainer.remove();
    
}

export default runJava ;


