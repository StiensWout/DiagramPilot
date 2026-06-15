export function finishPackageCheck({ issues, failureTitle, successMessage }) {
  if (issues.length > 0) {
    process.stderr.write(
      [failureTitle, ...issues.map((issue) => `- ${issue}`)].join("\n") + "\n",
    );
    return 1;
  }

  process.stdout.write(`${successMessage}\n`);
  return 0;
}
