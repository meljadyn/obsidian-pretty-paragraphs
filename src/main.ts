import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	MarkdownView,
} from 'obsidian';
import { Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';

interface PrettyParagraphsSettings {
	justifyText: boolean;
	prettyEnterMode: boolean;
	whitelistedFolders: string;
	applyToView: 'none' | 'reader' | 'editor' | 'both'; // NEW
}

const DEFAULT_SETTINGS: PrettyParagraphsSettings = {
	justifyText: false,
	prettyEnterMode: false,
	whitelistedFolders: '',
	applyToView: 'both',
};

export default class PrettyParagraphsPlugin extends Plugin {
	settings!: PrettyParagraphsSettings;

	async onload(): Promise<void> {
		console.debug('Loading Pretty Paragraphs plugin by meljadyn');
		await this.loadSettings();
		this.addSettingTab(new PrettyParagraphsSettingTab(this.app, this));

		this.applyGlobalClasses();

		this.registerEvent(
			this.app.workspace.on('file-open', () =>
				this.updateWorkspaceLeaves(),
			),
		);
		this.app.workspace.onLayoutReady(() => this.updateWorkspaceLeaves());

		// CodeMirror Keymap Interception
		this.registerEditorExtension(
			Prec.highest(
				keymap.of([
					{
						key: 'Enter',
						run: (view) => {
							if (!this.settings.prettyEnterMode) return false;
							if (!this.isEditorActive()) return false; // Check new view setting
							if (
								!this.isPrettyFile(
									this.app.workspace.getActiveFile(),
								)
							)
								return false;

							view.dispatch(view.state.replaceSelection('\n\n'));
							return true;
						},
					},
					{
						key: 'Shift-Enter',
						run: (view) => {
							if (!this.settings.prettyEnterMode) return false;
							if (!this.isEditorActive()) return false; // Check new view setting
							if (
								!this.isPrettyFile(
									this.app.workspace.getActiveFile(),
								)
							)
								return false;

							view.dispatch(view.state.replaceSelection('\n'));
							return true;
						},
					},
				]),
			),
		);

		// Obsidian Commands
		this.addCommand({
			id: 'insert-single-return',
			name: 'Insert single newline (soft break)',
			editorCheckCallback: (checking: boolean, editor, view) => {
				if (!this.isEditorActive() || !this.isPrettyFile(view.file))
					return false;
				if (!checking) editor.replaceSelection('\n');
				return true;
			},
		});

		this.addCommand({
			id: 'insert-double-return',
			name: 'Insert double newline (paragraph break)',
			editorCheckCallback: (checking: boolean, editor, view) => {
				if (!this.isEditorActive() || !this.isPrettyFile(view.file))
					return false;
				if (!checking) editor.replaceSelection('\n\n');
				return true;
			},
		});
	}

	onunload(): void {
		console.debug('Unloading Pretty Paragraphs plugin');
		document.body.classList.remove('pretty-paragraphs-justify');

		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view.getViewType() === 'markdown') {
				leaf.view.containerEl.classList.remove(
					'pretty-reader-active',
					'pretty-editor-active',
				);
			}
		});
	}

	// Helper to check if custom Enter logic should run in the editor
	isEditorActive(): boolean {
		return (
			this.settings.applyToView === 'editor' ||
			this.settings.applyToView === 'both'
		);
	}

	isPrettyFile(file: TFile | null): boolean {
		if (!file) return false;
		if (!this.settings.whitelistedFolders.trim()) return true;

		const folders = this.settings.whitelistedFolders
			.split(',')
			.map((f) => f.trim())
			.filter((f) => f.length > 0);

		if (folders.length === 0) return true;
		return folders.some(
			(folder) =>
				file.path.startsWith(folder + '/') || file.path === folder,
		);
	}

	updateWorkspaceLeaves(): void {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view.getViewType() === 'markdown') {
				const view = leaf.view as MarkdownView;
				const el = view.containerEl;

				// Reset classes
				el.classList.remove(
					'pretty-reader-active',
					'pretty-editor-active',
					'pretty-paragraphs-justify',
				);

				if (this.isPrettyFile(view.file)) {
					// Apply justify class if setting is enabled
					if (this.settings.justifyText) {
						el.classList.add('pretty-paragraphs-justify');
					}

					// Apply view-specific classes
					if (
						this.settings.applyToView === 'reader' ||
						this.settings.applyToView === 'both'
					) {
						el.classList.add('pretty-reader-active');
					}
					if (
						this.settings.applyToView === 'editor' ||
						this.settings.applyToView === 'both'
					) {
						el.classList.add('pretty-editor-active');
					}
				}
			}
		});
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.applyGlobalClasses();
		this.updateWorkspaceLeaves();
	}

	applyGlobalClasses(): void {
		document.body.classList.remove('pretty-paragraphs-justify');
	}
}

class PrettyParagraphsSettingTab extends PluginSettingTab {
	plugin: PrettyParagraphsPlugin;

	constructor(app: App, plugin: PrettyParagraphsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: 'Pretty Paragraphs Settings' });

		// NEW DROPDOWN SETTING
		new Setting(containerEl)
			.setName('Apply formatting to')
			.setDesc(
				'Choose which views should display pretty paragraph formatting.',
			)
			.addDropdown((drop) =>
				drop
					.addOption('none', 'None')
					.addOption('reader', 'Reader only')
					.addOption('editor', 'Editor only')
					.addOption('both', 'Both reader & editor')
					.setValue(this.plugin.settings.applyToView)
					.onChange(async (value: string) => {
						// <-- Accept generic string here
						// Cast the string to our strict type when assigning
						this.plugin.settings.applyToView = value as
							| 'none'
							| 'reader'
							| 'editor'
							| 'both';
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Justify text')
			.setDesc('Fully justify paragraphs in active views.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.justifyText)
					.onChange(async (value) => {
						this.plugin.settings.justifyText = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Double enter mode')
			.setDesc(
				'Pressing Enter inserts a new paragraph as if you had pressed Enter twice (double newline). Pressing Shift+Enter inserts a soft line break (like a single enter used to). (Only applies if formatting is active in the Editor).',
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.prettyEnterMode)
					.onChange(async (value) => {
						this.plugin.settings.prettyEnterMode = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Whitelisted folders')
			.setDesc(
				'Only apply formatting to files in these folders. Separate multiple folders with commas. Leave blank to apply to all files.',
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.whitelistedFolders)
					.onChange(async (value) => {
						this.plugin.settings.whitelistedFolders = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
