import fs from 'fs';
import path from 'path';

// Function to generate random code-like content
function generateCodeContent(lines: number): string {
    const codePatterns = [
        'function',
        'const',
        'let',
        'class',
        'interface',
        'type',
        'import',
        'export',
        'return',
        'async',
        'await',
        'try',
        'catch',
        'if',
        'else',
        'for',
        'while'
    ];

    const content: string[] = [];
    let indentLevel = 0;

    for (let i = 0; i < lines; i++) {
        const pattern = codePatterns[Math.floor(Math.random() * codePatterns.length)];
        const indent = '  '.repeat(indentLevel);

        switch (pattern) {
            case 'function':
                content.push(`${indent}function test${i}() {`);
                indentLevel++;
                break;
            case 'class':
                content.push(`${indent}class Test${i} {`);
                indentLevel++;
                break;
            case 'if':
                content.push(`${indent}if (condition${i}) {`);
                indentLevel++;
                break;
            case 'try':
                content.push(`${indent}try {`);
                indentLevel++;
                break;
            default:
                if (indentLevel > 0 && Math.random() < 0.2) {
                    indentLevel--;
                    content.push(`${indent}}`);
                } else {
                    content.push(`${indent}${pattern} value${i} = "test${i}";`);
                }
        }

        // Prevent too much nesting
        if (indentLevel > 3) {
            indentLevel--;
            content.push(`${'  '.repeat(indentLevel)}}`);
        }
    }

    // Close any remaining blocks
    while (indentLevel > 0) {
        indentLevel--;
        content.push(`${'  '.repeat(indentLevel)}}`);
    }

    return content.join('\n');
}

// Create test directory
const testDir = path.join(process.cwd(), 'test-files');
if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
}

// Generate files of different sizes
const files = [
    { name: 'small.ts', lines: 50 },          // Small file (~2KB)
    { name: 'medium.ts', lines: 300 },        // Medium file (~12KB)
    { name: 'large.ts', lines: 1000 },        // Large file (~40KB)
    { name: 'very-large.ts', lines: 2000 },   // Very large file (~80KB)
];

// Create a git repository
const gitInit = () => {
    if (!fs.existsSync(path.join(testDir, '.git'))) {
        console.log('Initializing git repository...');
        require('child_process').execSync('git init', { cwd: testDir });
    }
};

// Generate files and create commits
const generateFiles = () => {
    gitInit();

    files.forEach(({ name, lines }) => {
        const filePath = path.join(testDir, name);
        console.log(`Generating ${name} with ${lines} lines...`);
        fs.writeFileSync(filePath, generateCodeContent(lines));
    });

    // Create some directories with files
    const dirs = ['src', 'components', 'utils', 'tests'];
    dirs.forEach(dir => {
        const dirPath = path.join(testDir, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }

        // Create 2-3 files in each directory
        const numFiles = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numFiles; i++) {
            const fileName = `${dir}-file${i + 1}.ts`;
            const filePath = path.join(dirPath, fileName);
            const lines = 50 + Math.floor(Math.random() * 200);
            console.log(`Generating ${fileName} with ${lines} lines...`);
            fs.writeFileSync(filePath, generateCodeContent(lines));
        }
    });

    console.log('\nFiles generated successfully! To test the commit message generator:');
    console.log('\n1. Navigate to the test directory:');
    console.log('   cd test-files');
    console.log('\n2. Stage some files:');
    console.log('   # For small changes:');
    console.log('   git add small.ts');
    console.log('\n   # For medium changes:');
    console.log('   git add medium.ts src/');
    console.log('\n   # For large changes:');
    console.log('   git add large.ts components/ utils/');
    console.log('\n   # For very large changes:');
    console.log('   git add .');
    console.log('\n3. Generate commit message:');
    console.log('   aicommit');
    console.log('\n   # Or with multiline format:');
    console.log('   aicommit -m');
};

generateFiles(); 