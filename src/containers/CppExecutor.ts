import CodeExecutorStrategy, { ExecutionResponse } from '../types/codeExecutorStrategy';
import { CPP_IMAGE } from '../utils/constants';
import createContainer from './containerFactory';
import decodeDockerStream from './dockerHelper';
import pullImage from './pullImage';

class CppExecutor implements CodeExecutorStrategy {

    async execute(code: string, inputTestCase: string, outputCase: string): Promise<ExecutionResponse> {

        console.log("C++ executor called");

        // Buffer to store docker logs (stdout + stderr)
        const rawLogBuffer: Buffer[] = [];

        // Ensure docker image is available locally
        await pullImage(CPP_IMAGE);

        console.log("Initialising a new C++ docker container");

        // Command to:
        // 1. Save code into file
        // 2. Compile
        // 3. Execute with input
        const runCommand =
            `echo '${code.replace(/'/g, `'\\"`)}' > main.cpp && g++ main.cpp -o main && echo '${inputTestCase.replace(/'/g, `'\\"`)}' | ./main`;

        // Create docker container
        const cppDockerContainer = await createContainer(CPP_IMAGE, [
            '/bin/sh',
            '-c',
            runCommand
        ]);

        // Start container
        await cppDockerContainer.start();

        console.log("Started the docker container");

        // Fetch logs from container
        const loggerStream = await cppDockerContainer.logs({
            stdout: true,
            stderr: true,
            timestamps: false,
            follow: true
        });

        // Push log chunks into buffer
        loggerStream.on('data', (chunk) => {
            rawLogBuffer.push(chunk);
        });

        try {

            // Decode docker stream into readable output
            const codeResponse: string = await this.fetchDecodedStream(loggerStream, rawLogBuffer);

            // Fallback protection (IMPORTANT)
            const safeOutput = codeResponse || "";
            const safeExpected = outputCase || "";

            // Debug logs (helps during development)
            console.log("Actual Output:", safeOutput);
            console.log("Expected Output:", safeExpected);

            // Normalize output (handles newline differences)
            if (this.normalize(safeOutput) === this.normalize(safeExpected)) {
                return { output: safeOutput, status: "SUCCESS" };
            } else {
                return { output: safeOutput, status: "WA" }; // Wrong Answer
            }

        } catch (error) {

            console.log("Error occurred", error);

            // If time limit exceeded → kill container
            if (error === "TLE") {
                await cppDockerContainer.kill();
            }

            return { output: error as string, status: "ERROR" };

        } finally {

            // Always remove container (VERY IMPORTANT)
            await cppDockerContainer.remove();

        }
    }

    fetchDecodedStream(
        loggerStream: NodeJS.ReadableStream,
        rawLogBuffer: Buffer[]
    ): Promise<string> {

        return new Promise((res, rej) => {

            // Timeout protection (prevents infinite loops)
            const timeout = setTimeout(() => {
                console.log("Timeout called");
                rej("TLE");
            }, 2000);

            // When docker finishes execution
            loggerStream.on('end', () => {

                clearTimeout(timeout);

                // Merge all chunks into one buffer
                const completeBuffer = Buffer.concat(rawLogBuffer);

                // Decode docker multiplexed stream
                const decodedStream = decodeDockerStream(completeBuffer);

                console.log("Decoded Stream:", decodedStream);

                // Fallback protection (VERY IMPORTANT FIX)
                const stdout = decodedStream.stdout || "";
                const stderr = decodedStream.stderr || "";

                // If compilation/runtime error
                if (stderr) {
                    rej(stderr);
                } else {
                    res(stdout);
                }

            });

        });
    }

    // Normalize output (like real coding platforms)
    normalize(str: string = ""): string {
        return str.trim().replace(/\r\n/g, "\n");
    }

}

export default CppExecutor;