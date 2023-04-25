import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface ChatOptions {
  parent?: string;
  reference?: string[];
  header?: string[];
  context?: string[];
}

interface LogOptions {
  skip?: number;
  maxCount?: number;
}

interface LogEntry {
  "prompt-hash": string;
  user: string;
  date: string;
  message: string;
  response: string;
}

interface ChatResponse {
  "prompt-hash": string;
  user: string;
  date: string;
  response: string;
  isError: boolean;
}

class DevChat {
    async chat(content: string, options: ChatOptions = {}): Promise<ChatResponse> {
        let args = "";
      
        if (options.parent) {
          args += ` -p ${options.parent}`;
        }
        if (options.reference) {
          args += ` -r ${options.reference.join(",")}`;
        }
        if (options.header) {
          args += ` -h ${options.header.join(",")}`;
        }
        if (options.context) {
          args += ` -c ${options.context.join(",")}`;
        }
      
        const { stdout } = await execAsync(`devchat ${args} "${content}"`, {
            maxBuffer: 10 * 1024 * 1024, // Set maxBuffer to 10 MB
          });
        const responseLines = stdout.trim().split("\n");
        console.log(responseLines)
      
        if (responseLines.length === 0) {
          return {
            "prompt-hash": "",
            user: "",
            date: "",
            response: "",
            isError: true,
          };
        }
      
        if (responseLines[0].startsWith("error")) {
          return {
            "prompt-hash": "",
            user: "",
            date: "",
            response: responseLines.join("\n"),
            isError: true,
          };
        }
      
        const promptHashLine = responseLines.shift()!;
        const promptHash = promptHashLine.split(" ")[1];
      
        const userLine = responseLines.shift()!;
        const user = (userLine.match(/User: (.+)/)?.[1]) ?? "";
      
        const dateLine = responseLines.shift()!;
        const date = (dateLine.match(/Date: (.+)/)?.[1]) ?? "";
      
        const response = responseLines.join("\n");
      
        return {
          "prompt-hash": promptHash,
          user,
          date,
          response,
          isError: false,
        };
    }  

  async log(options: LogOptions = {}): Promise<LogEntry[]> {
    let args = "log";

    if (options.skip) {
      args += ` --skip ${options.skip}`;
    }
    if (options.maxCount) {
      args += ` --max-count ${options.maxCount}`;
    }

    const { stdout } = await execAsync(`devchat ${args}`, {
        maxBuffer: 10 * 1024 * 1024, // Set maxBuffer to 10 MB
      });
    return JSON.parse(stdout.trim());
  }
}

export default DevChat;
