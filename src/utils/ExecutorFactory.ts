import JavaExecutor from "../containers/javaExecutor";
import PythonExecutor from "../containers/pythonexecutor";
import CppExecutor from "../containers/CppExecutor";
import CodeExecutorStrategy from "../types/codeExecutorStrategy";


export default function createExecutor(codeLanguage?: string): CodeExecutorStrategy | null {

    // Safety check (VERY IMPORTANT)
    if (!codeLanguage) {
        console.error("Language is undefined");
        return null;
    }

    const lang = codeLanguage.toLowerCase();

    if (lang === "python") {
        return new PythonExecutor();
    } else if (lang === "java") {
        return new JavaExecutor();
    } else if (lang === "cpp") {
        return new CppExecutor();
    } else {
        console.error("Unsupported language:", codeLanguage);
        return null;
    }
}

