import CodeExecutorStrategy, { ExecutionResponse } from '../types/codeExecutorStrategy';
import { PYTHON_IMAGE } from '../utils/constants';
import createContainer from './containerFactory';
import decodeDockerStream from './dockerHelper';
import pullImage from './pullImage';
import { TestCases } from '../types/testCases';

class PythonExecutor implements CodeExecutorStrategy {

    async execute(code: string, testCases: TestCases): Promise<ExecutionResponse> {
        console.log("Python executor called for multiple test cases");

        const rawLogBuffer: Buffer[] = [];
        await pullImage(PYTHON_IMAGE);

        // Prepare run command with tags
        let runCommand = `echo '${code.replace(/'/g, `'\\"`)}' > test.py`;
        testCases.forEach((testCase, index) => {
            runCommand += ` && echo "TESTCASE_BEGIN_${index}" && echo '${testCase.input.replace(/'/g, `'\\"`)}' | python3 test.py && echo "TESTCASE_END_${index}"`;
        });

        const pythonDockerContainer = await createContainer(PYTHON_IMAGE, [
            '/bin/sh', 
            '-c',
            runCommand
        ]); 

        await pythonDockerContainer.start();

        const loggerStream = await pythonDockerContainer.logs({
            stdout: true,
            stderr: true,
            timestamps: false,
            follow: true
        });
        
        loggerStream.on('data', (chunk) => {
            rawLogBuffer.push(chunk);
        });

        try {
            const decodedResult = await this.fetchDecodedStream(loggerStream, rawLogBuffer);

            // Parse test case outputs
            for (let i = 0; i < testCases.length; i++) {
                const beginTag = `TESTCASE_BEGIN_${i}`;
                const endTag = `TESTCASE_END_${i}`;
                
                const startIdx = decodedResult.indexOf(beginTag);
                const endIdx = decodedResult.indexOf(endTag);
                
                if (startIdx === -1 || endIdx === -1) {
                    // This could happen if there was a runtime error in Python that stopped execution
                    return { output: decodedResult.trim(), status: "RE" };
                }

                const actualOutput = decodedResult.substring(startIdx + beginTag.length, endIdx).trim();
                const expectedOutput = testCases[i].output.trim();

                if (actualOutput !== expectedOutput) {
                    return { 
                        output: actualOutput, 
                        status: "WA" 
                    };
                }
            }

            return { output: "All test cases passed", status: "SUCCESS" };

        } catch (error) {
            console.log("Error occurred", error);
            if(error === "TLE") {
                await pythonDockerContainer.kill();
            }
            return {output: error as string, status: "ERROR"}
        } finally {
            await pythonDockerContainer.remove();
        }
    }

    fetchDecodedStream(loggerStream: NodeJS.ReadableStream, rawLogBuffer: Buffer[]) : Promise<string> {
        return new Promise((res, rej) => {
            const timeout = setTimeout(() => {
                rej("TLE");
            }, 5000); // Increased timeout for multiple cases
            
            loggerStream.on('end', () => {
                clearTimeout(timeout);
                const completeBuffer = Buffer.concat(rawLogBuffer);
                const decodedStream = decodeDockerStream(completeBuffer);
                
                if (decodedStream.stderr) {
                    res(decodedStream.stderr); // Returning stderr as error for Python
                } else {
                    res(decodedStream.stdout);
                }
            });
        })
    }
}

export default PythonExecutor;