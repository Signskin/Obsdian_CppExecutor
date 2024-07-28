import { Plugin, MarkdownRenderChild, PluginSettingTab, App, MarkdownPostProcessorContext, Setting, Notice } from 'obsidian';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as process from 'process'

const langPrefix = 'language-';

const SETTING_DEFAULT = {
    cppStandard: "",
    compileOptions: "",
    outputDirectory: "./compiled",
    showCompileCommand: true,
    compilerPath: "g++",
    includePath: "",
};

export default class CodeCompilerPlugin extends Plugin {
    settings: typeof SETTING_DEFAULT = SETTING_DEFAULT;

    async injectRunCode(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        const codeEl = el.querySelector('pre>code');
        if (codeEl && codeEl.className.startsWith(langPrefix)) {
            const lang = codeEl.className.substring(langPrefix.length).toLowerCase();
            if (lang === 'cpp') {
                ctx.addChild(new CodeRunWidgetView(
                    this,
                    codeEl.parentElement as HTMLElement,
                    lang,
                    codeEl.textContent || '',
                    ctx.sourcePath
                ));
            }
        }
    }

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new SettingTabView(this.app, this));
        this.registerMarkdownPostProcessor(this.injectRunCode.bind(this), -1);
    }

    async onunload() {
        await this.saveSettings();
        super.unload();
    }

    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, SETTING_DEFAULT, await this.loadData());
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }

    compileCppCode(code: string, outputElement: HTMLElement) {
        const vaultBasePath = (this.app.vault.adapter as any).basePath;
        const tempDir = path.join(vaultBasePath, this.settings.outputDirectory);

        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempFilePath = path.join(tempDir, 'temp.cpp');
        fs.writeFileSync(tempFilePath, code);

        const outputFilePath = path.join(tempDir, 'temp.out');
        const compilerPath = this.settings.compilerPath;
        const command = `${compilerPath} ${tempFilePath} -o ${outputFilePath} ${this.settings.cppStandard} ${this.settings.compileOptions}`;
        exec(command, (error, stdout, stderr) => {
            let result = '';
            if(this.settings.showCompileCommand)
                result += command + '\n';
            if (error) {
                result += `Error: ${stderr}`;
                console.error(`Error: ${stderr}`);
                this.showResult(outputElement, result);
            } else {
                result += `Compilation successful\n${stdout}`;
                console.log('Compilation successful');
                exec(outputFilePath, (runError, runStdout, runStderr) => {
                    if (runError) {
                        result += `\nRun Error: ${runStderr}`;
                        console.error(`Run Error: ${runStderr}`);
                    } else {
                        result += `\nRun Output:\n${runStdout}`;
                        console.log('Run successful');
                    }
                    this.showResult(outputElement, result);
                });
            }
        });
    }

    showResult(outputElement: HTMLElement, result: string) {
        let resultDiv = outputElement.querySelector('.cpp-result') as HTMLElement;
        if (!resultDiv) {
            resultDiv = document.createElement('div');
            resultDiv.className = 'cpp-result';
            resultDiv.setAttribute('style', 'white-space: pre-wrap; border-top: 1px solid #ccc; margin-top: 10px;');
            outputElement.appendChild(resultDiv);
        }
        resultDiv.textContent = result;
    }
}

export class SettingTabView extends PluginSettingTab {
    readonly plugin: CodeCompilerPlugin;

    constructor(app: App, plugin: CodeCompilerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): any {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'C++ Compiler Settings' });

        new Setting(containerEl)
            .setName('C++ Standard')
            .setDesc('The C++ standard to use for compilation')
            .addDropdown(dropdown => dropdown
                .addOption('', '(void)')
                .addOption('-std=c++98', 'C++98')
                .addOption('-std=c++03', 'C++03')
                .addOption('-std=c++11', 'C++11')
                .addOption('-std=c++14', 'C++14')
                .addOption('-std=c++17', 'C++17')
                .addOption('-std=c++20', 'C++20')
                .addOption('-std=c++23', 'C++23')
                .addOption('-std=c++27', 'C++27')
                .setValue(this.plugin.settings.cppStandard)
                .onChange(async (value) => {
                    this.plugin.settings.cppStandard = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Compile Options')
            .setDesc('Additional options for g++ compiler.')
            .addText(text => text
                .setPlaceholder('-Wall -O2')
                .setValue(this.plugin.settings.compileOptions)
                .onChange(async (value: string) => {
                    this.plugin.settings.compileOptions = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Output Directory')
            .setDesc('The directory where the compiled files will be saved.')
            .addText(text => text
                .setPlaceholder('Enter output directory')
                .setValue(this.plugin.settings.outputDirectory)
                .onChange(async (value) => {
                    this.plugin.settings.outputDirectory = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('Compiler Path')
            .setDesc('This allows you to designate a compiler path, instead of using g++ by default.')
            .addText(text => text
                .setPlaceholder('Enter comiler path')
                .setValue(this.plugin.settings.compilerPath)
                .onChange(async (value) => {
                    this.plugin.settings.compilerPath = value;
                    await this.plugin.saveSettings();
            }));

        new Setting(containerEl)
            .setName('Enable Printing Compiling Command')
            .setDesc('Configured true by default, which will enable printing the compilation command. ')
            .addDropdown(dropdown =>
                dropdown.addOption('True', 'True')
                .addOption('False', 'False')
                .setValue(this.plugin.settings.showCompileCommand ? 'True' : 'False')
                .onChange(async (value) =>{
                    this.plugin.settings.showCompileCommand = (value === 'True');
                    await this.plugin.saveSettings();
                }));

        const killProcessSetting = new Setting(containerEl)
            .setName('Kill Process')
            .setDesc('This will kill the process of the compiled code. Remember to Avoid using stdin in your code!')
            .addButton((button) => {
                button.setButtonText('kill')
                .setCta()
                .onClick(async() => {this.killProcess();});
            });

        // Why this does not work?
        // const descEl = killProcessSetting.settingEl.querySelector('.setting-item-description');
        // if (descEl) {
        //     descEl.setAttribute('color', 'red');
        // }

        // using .mod_warning instead
        const descEl = killProcessSetting.settingEl.querySelector('.setting-item-description');
        if (descEl) {
            descEl.classList.add('mod-warning');
        }
    }

    killProcess() : void
    {
        if(process.platform === 'win32')
        {
            exec('taskkill /f /im temp.out', (error, stdout, stderr)=>{
                if(error)
                {
                    new Notice('Error killing process temp.out');
                    console.log('Error killing process temp.out on platform Windows');
                }
                else
                {
                    new Notice('Process temp.out killed.');
                    console.log('Successfully killed process temp.out on platform Windows');
                }
            });
        }
        else
        {
            exec('pkill temp.out', (error, stdout, stderr) => {
                if(error)
                {
                    new Notice('Error killing process temp.out');
                    console.log('Error killing process temp.out on Unix-Like platform');
                }
                else
                {
                    new Notice('Process temp.out killed.');
                    console.log('Successfully killed process temp.out on Unix-Like platform');
                }
            });
        }
    }
}

class CodeRunWidgetView extends MarkdownRenderChild {
    readonly plugin: CodeCompilerPlugin;
    lang: string;
    code: string;
    sourcePath: string;

    constructor(plugin: CodeCompilerPlugin, containerEl: HTMLElement, lang: string, code: string, sourcePath: string) {
        super(containerEl);
        this.plugin = plugin;
        this.lang = lang;
        this.code = code;
        this.sourcePath = sourcePath;
    }

    onload() {
        const { containerEl, lang, code, sourcePath } = this;

        const resultDiv = document.createElement('div');
        resultDiv.className = 'cpp-result';
        resultDiv.setAttribute('style', 'white-space: pre-wrap; border-top: 1px solid #ccc; margin-top: 10px;');

        const button = document.createElement('button');
        button.textContent = 'Run';
        button.style.position = 'absolute';
        button.style.bottom = '10px';
        button.style.right = '10px';
        button.onclick = () => {
            this.plugin.compileCppCode(code, containerEl);
        };

        containerEl.style.position = 'relative';
        containerEl.appendChild(button);
        containerEl.appendChild(resultDiv);
    }

    onunload() {
        const button = this.containerEl.querySelector('button');
        if (button) button.remove();

        const resultDiv = this.containerEl.querySelector('.cpp-result');
        if (resultDiv) resultDiv.remove();
    }
}
