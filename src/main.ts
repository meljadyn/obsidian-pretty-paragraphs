import { Plugin, TFile, MarkdownView } from 'obsidian';
import {
	PrettyParagraphsSettings,
	DEFAULT_SETTINGS,
	PrettyParagraphsSettingTab,
} from './settings';

export default class PrettyParagraphsPlugin extends Plugin {
	settings!: PrettyParagraphsSettings;

	async onload(): Promise<void> {
		// Settings & Classes
		await this.loadSettings();
		this.addSettingTab(new PrettyParagraphsSettingTab(this.app, this));

		// The App
		this.registerEvent(
			this.app.workspace.on('file-open', () =>
				this.updateWorkspaceLeaves(),
			),
		);
		this.app.workspace.onLayoutReady(() => this.updateWorkspaceLeaves());
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
					// Apply view-specific classes
					if (
						this.settings.applyToView === 'reader' ||
						this.settings.applyToView === 'both'
					) {
						el.classList.add('pretty-reader-active');
						if (this.settings.justifyText) {
							el.classList.add('pretty-paragraphs-justify');
						}
					}
					if (
						this.settings.applyToView === 'editor' ||
						this.settings.applyToView === 'both'
					) {
						el.classList.add('pretty-editor-active');
						if (this.settings.justifyText) {
							el.classList.add('pretty-paragraphs-justify');
						}
					}
				}
			}
		});
	}

	// Assuming your settings interface is named something like MyPluginSettings
	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<PrettyParagraphsSettings>,
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.updateWorkspaceLeaves();
	}
}
