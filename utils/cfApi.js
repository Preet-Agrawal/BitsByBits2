const axios = require("axios");

// Fetch solved problems for a user
const getSolvedProblems = async (handle) => {
    try {
        const response = await axios.get(`https://codeforces.com/api/user.status?handle=${handle}`);
        const submissions = response.data.result;
        const solvedProblems = new Set();

        submissions.forEach((submission) => {
            if (submission.verdict === "OK") {
                const problemId = `${submission.problem.contestId}-${submission.problem.index}`;
                solvedProblems.add(problemId);
            }
        });

        return solvedProblems;
    } catch (error) {
        console.error(`Error fetching solved problems for ${handle}:`, error);
        return new Set();
    }
};

// Find an unsolved problem for two users
const findUnsolvedProblem = async (handle1, handle2) => {
    const [solved1, solved2] = await Promise.all([
        getSolvedProblems(handle1),
        getSolvedProblems(handle2),
    ]);

    try {
        const response = await axios.get("https://codeforces.com/api/problemset.problems");
        const problems = response.data.result.problems;

        const unsolvedProblems = problems.filter((problem) => {
            const problemId = `${problem.contestId}-${problem.index}`;
            return !solved1.has(problemId) && !solved2.has(problemId);
        });

        if (unsolvedProblems.length > 0) {
            const randomProblem = unsolvedProblems[Math.floor(Math.random() * unsolvedProblems.length)];
            return `https://codeforces.com/problemset/problem/${randomProblem.contestId}/${randomProblem.index}`;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching problems from Codeforces:", error);
        return null;
    }
};

module.exports = { getSolvedProblems, findUnsolvedProblem };