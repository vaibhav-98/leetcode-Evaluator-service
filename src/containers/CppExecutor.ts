import CodeExecutorStrategy, { ExecutionResponse } from '../types/codeExecutorStrategy';
import { CPP_IMAGE } from '../utils/constants';
import createContainer from './containerFactory';
import decodeDockerStream from './dockerHelper';
import pullImage from './pullImage';
import { TestCases } from '../types/testCases';

class CppExecutor implements CodeExecutorStrategy {

    async execute(code: string, testCases: TestCases): Promise<ExecutionResponse> {
        console.log("Cpp executor called for multiple test cases");

        const rawLogBuffer: Buffer[] = [];
        await pullImage(CPP_IMAGE);

        let runCommand = `echo '${code.replace(/'/g, `'\\"`)}' > main.cpp && if g++ main.cpp -o main 2> compile_error.txt; then echo "COMPILATION_SUCCESS"`;
        
        testCases.forEach((testCase, index) => {
            runCommand += ` && echo "TESTCASE_BEGIN_${index}" && echo '${testCase.input.replace(/'/g, `'\\"`)}' | ./main && echo "TESTCASE_END_${index}"`;
        });

        runCommand += `; else echo "COMPILATION_ERROR" && cat compile_error.txt; fi`;

        const cppDockerContainer = await createContainer(CPP_IMAGE, [
            '/bin/sh', 
            '-c',
            runCommand
        ]); 

        await cppDockerContainer.start();

        const loggerStream = await cppDockerContainer.logs({
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
            
            // Check for Compilation Error
            if (decodedResult.includes("COMPILATION_ERROR")) {
                const errorLog = decodedResult.replace("COMPILATION_ERROR", "").trim();
                return { output: errorLog, status: "CE" };
            }

            // Parse test case outputs
            for (let i = 0; i < testCases.length; i++) {
                const beginTag = `TESTCASE_BEGIN_${i}`;
                const endTag = `TESTCASE_END_${i}`;
                
                const startIdx = decodedResult.indexOf(beginTag);
                const endIdx = decodedResult.indexOf(endTag);
                
                if (startIdx === -1 || endIdx === -1) {
                    return { output: "System Error or Runtime Error: Missing test case output", status: "RE" };
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
                await cppDockerContainer.kill();
            }
            return {output: error as string, status: "ERROR"}
        } finally {
            await cppDockerContainer.remove();
        }
    }

    fetchDecodedStream(loggerStream: NodeJS.ReadableStream, rawLogBuffer: Buffer[]) : Promise<string> {
        return new Promise((res, rej) => {
            const timeout = setTimeout(() => {
                rej("TLE");
            }, 5000); 
            
            loggerStream.on('end', () => {
                clearTimeout(timeout);
                const completeBuffer = Buffer.concat(rawLogBuffer);
                const decodedStream = decodeDockerStream(completeBuffer);
                
                if (decodedStream.stderr && !decodedStream.stdout.includes("COMPILATION_ERROR")) {
                    res(decodedStream.stderr || decodedStream.stdout); 
                } else {
                    res(decodedStream.stdout);
                }
            });
        })
    }
}

export default CppExecutor;