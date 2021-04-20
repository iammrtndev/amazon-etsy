import readline from 'readline';

const UI = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export async function promptInputAsync(question: string): Promise<string> {
  return new Promise((resolve) => {
    UI.question(question, (answer) => {
      resolve(answer);
    });
  });
}

export async function promptInputsAsync(question: string) {
  const inputs: string[] = [];
  do {
    const input = await promptInputAsync(
      `${question} (leave blank to finish)\n`
    );
    inputs.push(input);
  } while (inputs[inputs.length - 1] !== '');
  inputs.pop();
  return inputs;
}
