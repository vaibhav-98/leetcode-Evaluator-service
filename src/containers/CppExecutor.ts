import CodeExecutorStrategy, { ExecutionResponse } from '../types/codeExecutorStrategy';
import { CPP_IMAGE } from '../utils/constants';
import createContainer from './containerFactory';
import decodeDockerStream from './dockerHelper';
import pullImage from './pullImage';

class CppExecutor implements CodeExecutorStrategy {

    async execute(code: string, inputTestCase: string, outputCase: string): Promise<ExecutionResponse> {

        console.log("C++ executor called");

        // This buffer stores raw docker logs (stdout + stderr)
        const rawLogBuffer: Buffer[] = [];

        // Ensure the docker image exists locally (pull if not present)
        await pullImage(CPP_IMAGE);

        console.log("Initialising a new C++ docker container");

        // Command executed inside the docker container
        // 1. Save code into main.cpp
        // 2. Compile using g++
        // 3. Pipe input test case to the executable
        const runCommand =
            `echo '${code.replace(/'/g, `'\\"`)}' > main.cpp && g++ main.cpp -o main && echo '${inputTestCase.replace(/'/g, `'\\"`)}' | ./main`;

        // Create docker container with the command
        const cppDockerContainer = await createContainer(CPP_IMAGE, [
            '/bin/sh',
            '-c',
            runCommand
        ]);

        // Start / boot the container
        await cppDockerContainer.start();

        console.log("Started the docker container");

        // Get container logs
        const loggerStream = await cppDockerContainer.logs({
            stdout: true,       // capture standard output
            stderr: true,       // capture errors
            timestamps: false,
            follow: true        // stream logs instead of returning once
        });

        // Every chunk of log data is pushed into the buffer
        loggerStream.on('data', (chunk) => {
            rawLogBuffer.push(chunk);
        });

        try {

            // Decode docker stream into readable output
            const codeResponse: string = await this.fetchDecodedStream(loggerStream, rawLogBuffer);

            // Compare program output with expected output
            if (codeResponse.trim() === outputCase.trim()) {
                return { output: codeResponse, status: "SUCCESS" };
            } else {
                return { output: codeResponse, status: "WA" }; // Wrong Answer
            }

        } catch (error) {

            console.log("Error occurred", error);

            // If program exceeded time limit
            if (error === "TLE") {
                await cppDockerContainer.kill(); // stop container immediately
            }

            return { output: error as string, status: "ERROR" };

        } finally {

            // Remove container after execution to avoid resource leak
            await cppDockerContainer.remove();

        }
    }


    fetchDecodedStream(
        loggerStream: NodeJS.ReadableStream,
        rawLogBuffer: Buffer[]
    ): Promise<string> {

        return new Promise((res, rej) => {

            // Timeout protection (Time Limit Exceeded)
            const timeout = setTimeout(() => {
                console.log("Timeout called");
                rej("TLE");
            }, 2000);

            // Triggered when docker stops sending logs
            loggerStream.on('end', () => {

                clearTimeout(timeout);

                // Combine all buffer chunks into a single buffer
                const completeBuffer = Buffer.concat(rawLogBuffer);

                // Decode docker multiplexed stream
                const decodedStream = decodeDockerStream(completeBuffer);

                // If compilation/runtime error occurred
                if (decodedStream.stderr) {
                    rej(decodedStream.stderr);
                } else {
                    res(decodedStream.stdout);
                }

            });

        });
    }

}

export default CppExecutor;