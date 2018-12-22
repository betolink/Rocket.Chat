/* global SyncedCron */
import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import { Logger } from 'meteor/rocketchat:logger';
import { getWorkspaceAccessToken } from 'meteor/rocketchat:cloud';
const logger = new Logger('SyncedCron');

SyncedCron.config({
	logger(opts) {
		return logger[opts.level].call(logger, opts.message);
	},
	collectionName: 'rocketchat_cron_history',
});

function generateStatistics() {
	const statistics = RocketChat.statistics.save();

	statistics.host = Meteor.absoluteUrl();

	if (RocketChat.settings.get('Statistics_reporting')) {
		try {
			const headers = {};
			const token = getWorkspaceAccessToken();

			if (token) {
				headers.Authorization = `Bearer ${ token }`;
			}

			HTTP.post('https://collector.rocket.chat/', {
				data: statistics,
				headers,
			});
		} catch (error) {
			/* error*/
			logger.warn('Failed to send usage report');
		}
	}
}

function cleanupOEmbedCache() {
	return Meteor.call('OEmbedCacheCleanup');
}

Meteor.startup(function() {
	return Meteor.defer(function() {
		generateStatistics();

		SyncedCron.add({
			name: 'Generate and save statistics',
			schedule(parser) {
				return parser.cron(`${ new Date().getMinutes() } * * * *`);
			},
			job: generateStatistics,
		});

		SyncedCron.add({
			name: 'Cleanup OEmbed cache',
			schedule(parser) {
				const now = new Date();
				return parser.cron(`${ now.getMinutes() } ${ now.getHours() } * * *`);
			},
			job: cleanupOEmbedCache,
		});

		return SyncedCron.start();
	});
});
