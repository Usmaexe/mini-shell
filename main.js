const readline = require("readline");
const fs = require("fs");
const { exec } = require("child_process");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "$ "
});

let code = 0;
const HOME_DIR = process.env.HOME || process.env.USERPROFILE;
// const cmdsName = ["echo", "pwd", "exit", "type", "cd", "cat"];
const cmdsName = ["echo", "pwd", "exit", "type", "cd"];

function parseInput(input) {
    return input.match(/(?:[^\s'"]+|['"][^'"]*['"])+/g) || [];
}

const commands = {
    ls : async(args) => {
        return await new Promise((resolve)=>{
            // here we check if its only ls command with 0 args
            if(args.length===0){
                exec(`ls`,(err,stdout)=>{
                    if(err){
                        resolve({ errors: ['ls: error executing ls\n'], outputs: [] });
                    } else {
                        resolve({ errors: [], outputs: [stdout.split("\n").join("  ")+"\n"] });
                    }
                });
            }
            // or ls with args
            else{
                let errors = [];
                let outputs = [];
                let completed = 0;
                // here we go on each arg(file or directory) and run the ls command
                for(let arg of args){
                    exec(`ls ${arg}`,(err,stdout)=>{
                        // the command will either result in an error, which we then add to the errors array
                        if(err){
                            const error = `ls: cannot acess '${arg}': No such file or directory\n`;
                            errors.push(error);
                        }
                        // if the comment run successfully we add it to the outputs array so we can output our array
                        else{
                            let output;
                            if(completed!=0){
                                // add new lines between diffrent outputs of commands to imitate the real shell output
                                outputs.push("\n");
                            }
                            if(arg.indexOf('.')!==-1&&arg.indexOf('.')!==0){
                                output = arg + "\n";
                            }
                            else{
                                output = `${arg}:\n` + stdout.split("\n").join("  ") + "\n";
                            }
                            outputs.push(output);
                        }
                        completed++;
                        
                        if(completed === args.length){
                            resolve({ errors, outputs });
                        }
                    });
                }
            }
        })
    },

    cat: async (args) => {
        for (let file of args) {
            try {
                const result = fs.readFileSync(file, "utf8");
                return result;
            } 
            catch (e) {
                return [`cat: ${file}: No such file or directory`];
            }
        }
    },

    cd: async (args) => {
        if (args.length > 1) {
            return "bash: cd: too many arguments";
        }

        let targetDir = args[0]
            ? args[0].replace(/^~(?=$|[\\/])/, HOME_DIR)
            : HOME_DIR;
    
        try {
            process.chdir(targetDir);
        } catch (err) {
            return [`cd: ${targetDir}: No such file or directory`];
        }
    },

    type: async (args) => {
        if (cmdsName.includes(args[0])) {
            return `${args[0]} is a shell builtin`;
        } else {
            return await new Promise((resolve) => {
                exec(`which ${args[0]}`, (err, stdout) => {
                    if (err) resolve([`${args[0]}: not found`]);
                    else resolve(`${args[0]} is ${stdout.trim()}`);
                });
            });
        }
    },

    echo: async (args) => {
        return (
            args
                .join(" ")
                .replace(/\\([^a-z])/g, "$1")
                .replace(/^['"]|['"]$/g, "") + "\n"
        );
    },

    pwd: async () => {
        return process.cwd() + "\n";
    }
};

function extractRedirection(args) {
    const index = args.indexOf(">")!==-1
        ?args.indexOf(">") //if the index exist the value will be the index of >
        :args.indexOf("2>"); // if > is not there check for 2> if its not there put -1

    if(index ===-1){
        //the logic if there is no output redirection 
        return { args, file: null, isStdout: false};
    }
    if (index !== -1) {
        let isStdout = true;
        if(args.indexOf(">")===-1){
            isStdout = false;
        }
        // the logic for StandardOutput
        const file = args[index + 1];
        const cleanArgs = args.slice(0, index);
        return { args: cleanArgs, file, isStdout };
    }
}

/*
cmd(String) : the command used (String)
args(Array) : the arguments of the command might be an empty for some commands
isStdout(Boolean) : boolean used in case of file streaming indicating that we want to do stdout instead of stderr(bool)
file(String): the file name
*/

async function runWithRedirection(cmd, args, isStdout, file) {
    let output = "";

    if (commands[cmd]) {
        // the command ls returns 2 object(arrays)
        if(cmd==="ls"){
            const { errors, outputs } = await commands[cmd](args);
            if (isStdout) {
                // there is no errors to write to a file
                output = outputs.join("");
            } else {
                console.log(outputs.join(""));
                output = errors.join("");
            }
        }
        // the other commands returns 1 object(string or a 1-sized array )
        else{
            const result = await commands[cmd](args);
            if (typeof result === "string") {
                output = result;
            } else if (Array.isArray(result) && !isStdout) {
                output = result.join("\n");
            }
        }
    }
    fs.writeFileSync(file, output);
}

rl.prompt();

rl.on("line", async (input) => {
    const [cmd, ...args] = parseInput(input);

    if (!cmd) return rl.prompt();

    switch (cmd) {
        case "exit":
            code = args[0] ? parseInt(args[0]) : 0;
            rl.close();
            return;

        default:
            if (commands[cmd]) {
                const { args: cleanArgs, file, isStdout } = extractRedirection(args);

                if (file) {
                    await runWithRedirection(cmd, cleanArgs, isStdout, file);
                } 
                else {
                    let result;
                    if(cmd === "ls"){
                        let {errors, outputs} = await commands[cmd](cleanArgs);
                        result = [...errors,...outputs].join('');
                    }
                    else{
                        result = await commands[cmd](cleanArgs);
                    }
                    if (typeof result === "string") console.log(result);
                    if (typeof result === "object") console.error(result[0]);
                }
            } else {
                console.log(`${cmd}: command not found`);
            }
    }

    rl.prompt();
});

rl.on("close", () => {
    console.log("# Shell exits with code " + code);
    rl.removeAllListeners();
    process.exit(0);
});
