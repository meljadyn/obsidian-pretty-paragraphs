import { App, PluginSettingTab, Setting } from 'obsidian';
import PrettyParagraphsPlugin from './main';

export interface PrettyParagraphsSettings {
	justifyText: boolean;
	prettyEnterMode: boolean;
	whitelistedFolders: string;
	applyToView: 'none' | 'reader' | 'editor' | 'both'; // NEW
}

export const DEFAULT_SETTINGS: PrettyParagraphsSettings = {
	justifyText: false,
	prettyEnterMode: false,
	whitelistedFolders: '',
	applyToView: 'both',
};

export class PrettyParagraphsSettingTab extends PluginSettingTab {
	plugin: PrettyParagraphsPlugin;

	constructor(app: App, plugin: PrettyParagraphsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	// New Settings Display (1.13.0+)
	getSettingDefinitions() {
		return [
			{
				name: 'Apply To',
				desc: 'Choose which views should display pretty paragraph formatting.',
				control: {
					type: 'dropdown' as const,
					key: 'applyToView',
					defaultValue: 'Both reader & editor',
					options: {
						none: 'None',
						reader: 'Reader only',
						editor: 'Editor only',
						both: 'Both reader & editor',
					},
				},
			},
			{
				name: 'Justify text',
				desc: 'Fully justify paragraphs in active views.',
				control: {
					type: 'toggle' as const,
					key: 'justifyText',
					defaultValue: false,
				},
			},
			{
				name: 'Whitelisted folders',
				desc: 'Only apply formatting to files in these folders. Separate multiple folders with commas. Leave blank to apply to all files.',
				control: {
					type: 'text' as const,
					key: 'whitelistedFolders',
					defaultValue: '',
				},
			},
		];
	}

	// Settings Display (pre-1.13.0)
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Apply Formatting To
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
						this.plugin.settings.applyToView = value as
							| 'none'
							| 'reader'
							| 'editor'
							| 'both';
						await this.plugin.saveSettings();
					}),
			);

		// Justify Text
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

		// Whitelisted Folders
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
