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
const cmdsName = ["echo", "pwd", "exit", "type", "cd", "ls"];

function parseInput(input) {
    return input.match(/(?:[^\s'"]+|['"][^'"]*['"])+/g) || [];
}

const commands = {
    ls :
    cat: async (args) => {
        for (let file of args) {
            try {
                const content = fs.readFileSync(file, "utf8");
                process.stdout.write(content);
            } catch (e) {
                console.log(`cat: ${file}: No such file`);
            }
        }
    },

    cd: async (args) => {
        if (args.length > 1) {
            console.log("bash: cd: too many arguments");
            return;
        }

        let targetDir = args[0]
            ? args[0].replace(/^~(?=$|[\\/])/, HOME_DIR)
            : HOME_DIR;

        try {
            process.chdir(targetDir);
        } catch (err) {
            console.log(`cd: ${targetDir}: No such file or directory`);
        }
    },

    type: async (args) => {
        if (cmdsName.includes(args[0])) {
            console.log(`${args[0]} is a shell builtin`);
        } else {
            await new Promise((resolve) => {
                exec(`which ${args[0]}`, (err, stdout) => {
                    if (err) console.error(`${args[0]}: not found`);
                    else console.log(`${args[0]} is ${stdout.trim()}`);
                    resolve();
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
    const index = args.indexOf(">");

    if (index === -1) return { args, file: null };

    const file = args[index + 1];
    const cleanArgs = args.slice(0, index);

    return { args: cleanArgs, file };
}

async function runWithRedirection(cmd, args, file) {
    let output = "";

    if (commands[cmd]) {
        const result = await commands[cmd](args);
        if (typeof result === "string") output = result;
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
                const { args: cleanArgs, file } = extractRedirection(args);
                console.log(cleanArgs);

                if (file) {
                    await runWithRedirection(cmd, cleanArgs, file);
                } else {
                    const result = await commands[cmd](cleanArgs);
                    if (typeof result === "string") process.stdout.write(result);
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
