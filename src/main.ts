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

	// CORE LOGIC: Add classes dynamically to markdown leaves based on settings
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

				// If file is whitelisted, apply classes based on settings
				if (this.isPrettyFile(view.file)) {
					// Apply view-specific classes
					switch (this.settings.applyToView) {
						case 'none':
							break;
						case 'reader':
							el.classList.add('pretty-reader-active');
							break;
						case 'editor':
							el.classList.add('pretty-editor-active');
							break;
						case 'both':
							el.classList.add(
								'pretty-reader-active',
								'pretty-editor-active',
							);
							break;
					}

					// Apply justify class if enabled
					if (this.settings.justifyText) {
						el.classList.add('pretty-paragraphs-justify');
					}
				}
			}
		});
	}

	// HELPER: Check if folder is whitelisted
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

	// UNLOAD: Remove classes when plugin is disabled or unloaded
	onunload(): void {
		console.debug('Unloading Pretty Paragraphs plugin');

		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view.getViewType() === 'markdown') {
				leaf.view.containerEl.classList.remove(
					'pretty-reader-active',
					'pretty-editor-active',
					'pretty-paragraphs-justify',
				);
			}
		});
	}

	// Basic Setup for Settings - Load
	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<PrettyParagraphsSettings>,
		);
	}

	// Basic Setup for Settings - Save
	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.updateWorkspaceLeaves();
	}
}
