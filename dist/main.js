"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingTabView = void 0;
const obsidian_1 = require("obsidian");
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const process = __importStar(require("process"));
const langPrefix = 'language-';
const SETTING_DEFAULT = {
    cppStandard: "",
    compileOptions: "",
    outputDirectory: "./compiled",
    showCompileCommand: true,
    compilerPath: "g++",
    includePath: "",
};
class CodeCompilerPlugin extends obsidian_1.Plugin {
    constructor() {
        super(...arguments);
        this.settings = SETTING_DEFAULT;
    }
    injectRunCode(el, ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const codeEl = el.querySelector('pre>code');
            if (codeEl && codeEl.className.startsWith(langPrefix)) {
                const lang = codeEl.className.substring(langPrefix.length).toLowerCase();
                if (lang === 'cpp') {
                    ctx.addChild(new CodeRunWidgetView(this, codeEl.parentElement, lang, codeEl.textContent || '', ctx.sourcePath));
                }
            }
        });
    }
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadSettings();
            this.addSettingTab(new SettingTabView(this.app, this));
            this.registerMarkdownPostProcessor(this.injectRunCode.bind(this), -1);
        });
    }
    onunload() {
        const _super = Object.create(null, {
            unload: { get: () => super.unload }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield this.saveSettings();
            _super.unload.call(this);
        });
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            this.settings = Object.assign({}, SETTING_DEFAULT, yield this.loadData());
        });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.saveData(this.settings);
        });
    }
    compileCppCode(code, outputElement) {
        const vaultBasePath = this.app.vault.adapter.basePath;
        const tempDir = path.join(vaultBasePath, this.settings.outputDirectory);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const tempFilePath = path.join(tempDir, 'temp.cpp');
        fs.writeFileSync(tempFilePath, code);
        const outputFilePath = path.join(tempDir, 'temp.out');
        const compilerPath = this.settings.compilerPath;
        const command = `${compilerPath} ${tempFilePath} -o ${outputFilePath} ${this.settings.cppStandard} ${this.settings.compileOptions}`;
        (0, child_process_1.exec)(command, (error, stdout, stderr) => {
            let result = '';
            if (this.settings.showCompileCommand)
                result += command + '\n';
            if (error) {
                result += `Error: ${stderr}`;
                console.error(`Error: ${stderr}`);
                this.showResult(outputElement, result);
            }
            else {
                result += `Compilation successful\n${stdout}`;
                console.log('Compilation successful');
                (0, child_process_1.exec)(outputFilePath, (runError, runStdout, runStderr) => {
                    if (runError) {
                        result += `\nRun Error: ${runStderr}`;
                        console.error(`Run Error: ${runStderr}`);
                    }
                    else {
                        result += `\nRun Output:\n${runStdout}`;
                        console.log('Run successful');
                    }
                    this.showResult(outputElement, result);
                });
            }
        });
    }
    showResult(outputElement, result) {
        let resultDiv = outputElement.querySelector('.cpp-result');
        if (!resultDiv) {
            resultDiv = document.createElement('div');
            resultDiv.className = 'cpp-result';
            resultDiv.setAttribute('style', 'white-space: pre-wrap; border-top: 1px solid #ccc; margin-top: 10px;');
            outputElement.appendChild(resultDiv);
        }
        resultDiv.textContent = result;
    }
}
exports.default = CodeCompilerPlugin;
class SettingTabView extends obsidian_1.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'C++ Compiler Settings' });
        new obsidian_1.Setting(containerEl)
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
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.cppStandard = value;
            yield this.plugin.saveSettings();
        })));
        new obsidian_1.Setting(containerEl)
            .setName('Compile Options')
            .setDesc('Additional options for g++ compiler.')
            .addText(text => text
            .setPlaceholder('-Wall -O2')
            .setValue(this.plugin.settings.compileOptions)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.compileOptions = value;
            yield this.plugin.saveSettings();
        })));
        new obsidian_1.Setting(containerEl)
            .setName('Output Directory')
            .setDesc('The directory where the compiled files will be saved.')
            .addText(text => text
            .setPlaceholder('Enter output directory')
            .setValue(this.plugin.settings.outputDirectory)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.outputDirectory = value;
            yield this.plugin.saveSettings();
        })));
        new obsidian_1.Setting(containerEl)
            .setName('Compiler Path')
            .setDesc('This allows you to designate a compiler path, instead of using g++ by default.')
            .addText(text => text
            .setPlaceholder('Enter comiler path')
            .setValue(this.plugin.settings.compilerPath)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.compilerPath = value;
            yield this.plugin.saveSettings();
        })));
        new obsidian_1.Setting(containerEl)
            .setName('Enable Printing Compiling Command')
            .setDesc('Configured true by default, which will enable printing the compilation command. ')
            .addDropdown(dropdown => dropdown.addOption('True', 'True')
            .addOption('False', 'False')
            .setValue(this.plugin.settings.showCompileCommand ? 'True' : 'False')
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.showCompileCommand = (value === 'True');
            yield this.plugin.saveSettings();
        })));
        const killProcessSetting = new obsidian_1.Setting(containerEl)
            .setName('Kill Process')
            .setDesc('This will kill the process of the compiled code. Remember to Avoid using stdin in your code!')
            .addButton((button) => {
            button.setButtonText('kill')
                .setCta()
                .onClick(() => __awaiter(this, void 0, void 0, function* () { this.killProcess(); }));
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
    killProcess() {
        if (process.platform === 'win32') {
            (0, child_process_1.exec)('taskkill /f /im temp.out', (error, stdout, stderr) => {
                if (error) {
                    new obsidian_1.Notice('Error killing process temp.out');
                    console.log('Error killing process temp.out on platform Windows');
                }
                else {
                    new obsidian_1.Notice('Process temp.out killed.');
                    console.log('Successfully killed process temp.out on platform Windows');
                }
            });
        }
        else {
            (0, child_process_1.exec)('pkill temp.out', (error, stdout, stderr) => {
                if (error) {
                    new obsidian_1.Notice('Error killing process temp.out');
                    console.log('Error killing process temp.out on Unix-Like platform');
                }
                else {
                    new obsidian_1.Notice('Process temp.out killed.');
                    console.log('Successfully killed process temp.out on Unix-Like platform');
                }
            });
        }
    }
}
exports.SettingTabView = SettingTabView;
class CodeRunWidgetView extends obsidian_1.MarkdownRenderChild {
    constructor(plugin, containerEl, lang, code, sourcePath) {
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
        if (button)
            button.remove();
        const resultDiv = this.containerEl.querySelector('.cpp-result');
        if (resultDiv)
            resultDiv.remove();
    }
}
