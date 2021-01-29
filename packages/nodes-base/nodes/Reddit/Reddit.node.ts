import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	handleListing,
	redditApiRequest,
} from './GenericFunctions';

import {
	postCommentFields,
	postCommentOperations,
} from './PostCommentDescription';

import {
	postFields,
	postOperations,
} from './PostDescription';

import {
	profileFields,
	profileOperations,
} from './ProfileDescription';

import {
	subredditFields,
	subredditOperations,
} from './SubredditDescription';

import {
	userFields,
	userOperations,
} from './UserDescription';

export class Reddit implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Reddit',
		name: 'reddit',
		icon: 'file:reddit.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Reddit API',
		defaults: {
			name: 'Reddit',
			color: '#ff5700',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'redditOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'postComment',
							'post',
							'profile',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Comment',
						value: 'comment',
					},
					{
						name: 'Post',
						value: 'post',
					},
					{
						name: 'Post Comment',
						value: 'postComment',
					},
					{
						name: 'Profile',
						value: 'profile',
					},
					{
						name: 'Subreddit',
						value: 'subreddit',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'comment',
				description: 'Resource to consume',
			},
			...postCommentOperations,
			...postCommentFields,
			...profileOperations,
			...profileFields,
			...subredditOperations,
			...subredditFields,
			...postOperations,
			...postFields,
			...userOperations,
			...userFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {

			// *********************************************************************
			// 														 post comment
			// *********************************************************************

			if (resource === 'postComment') {

				// ----------------------------------
				//        postComment: add
				// ----------------------------------

				if (operation === 'add') {

					const qs: IDataObject = {
						text: this.getNodeParameter('text', i),
						thing_id: this.getNodeParameter('targetId', i),
					};

					responseData = await redditApiRequest.call(this, 'POST', 'api/comment', qs);

				} else if (operation === 'getAll') {

					// ...

				} else if (operation === 'remove') {

					// ...

				} else if (operation === 'reply') {

					// ...

				}


			// *********************************************************************
			// 															  profile
			// *********************************************************************

			} else if (resource === 'profile') {

				// ----------------------------------
				//         profile: get
				// ----------------------------------

				// https://www.reddit.com/dev/api/#GET_api_v1_me
				// https://www.reddit.com/dev/api/#GET_api_v1_me_karma
				// https://www.reddit.com/dev/api/#GET_api_v1_me_prefs
				// https://www.reddit.com/dev/api/#GET_api_v1_me_trophies
				// https://www.reddit.com/dev/api/#GET_prefs_{where}

				if (operation === 'get') {

					const endpoints: { [key: string]: string } = {
						identity: 'me',
						blockedUsers: 'me/blocked',
						friends: 'me/friends',
						karma: 'me/karma',
						prefs: 'me/prefs',
						trophies: 'me/trophies',
					};

					const details = this.getNodeParameter('details', i) as string;
					const endpoint = `api/v1/${endpoints[details]}`;
					responseData = await redditApiRequest.call(this, 'GET', endpoint, {});

					if (details === 'identity') {
						responseData = responseData.features;
					}

				}

			// *********************************************************************
			// 															 subreddit
			// *********************************************************************

			} else if (resource === 'subreddit') {

				// ----------------------------------
				//        subreddit: get
				// ----------------------------------

				if (operation === 'get') {

					// https://www.reddit.com/dev/api/#GET_r_{subreddit}_about
					// https://www.reddit.com/dev/api/#GET_r_{subreddit}_about_rules
					// https://www.reddit.com/dev/api/#GET_sticky

					const qs: IDataObject = {};

					const subreddit = this.getNodeParameter('subreddit', i);
					const content = this.getNodeParameter('content', i) as string;
					const endpoint = `r/${subreddit}/about/${content}.json`;

					responseData = await redditApiRequest.call(this, 'GET', endpoint, qs);

					if (content === 'rules') {
						responseData = responseData.rules;
					} else if (content === 'about') {
						responseData = responseData.data;
					} else if (content === 'sticky') {
						responseData = responseData.map((item: any) => item.data.children[0].data); // tslint:disable-line:no-any
					}

				// ----------------------------------
				//        subreddit: getAll
				// ----------------------------------

				} else if (operation === 'getAll') {

					// https://www.reddit.com/dev/api/#GET_api_trending_subreddits
					// https://www.reddit.com/dev/api/#POST_api_search_subreddits

					const trending = this.getNodeParameter('trending', i) as IDataObject;

					if (trending) {
						const endpoint = 'api/trending_subreddits.json';
						responseData = await redditApiRequest.call(this, 'GET', endpoint, {});
					} else {
						const endpoint = 'api/search_subreddits.json';
						responseData = await handleListing.call(this, i, endpoint);
					}
				}

			// *********************************************************************
			// 															  post
			// *********************************************************************

			} else if (resource === 'post') {

				// ----------------------------------
				//         post: create
				// ----------------------------------

				if (operation === 'create') {

					// https://www.reddit.com/dev/api/#POST_api_submit

					const qs: IDataObject = {
						title: this.getNodeParameter('title', i),
						sr: this.getNodeParameter('subreddit', i),
						kind: this.getNodeParameter('kind', i),
					};

					qs.kind === 'self'
						? qs.text = this.getNodeParameter('text', i)
						: qs.url = this.getNodeParameter('url', i);

					if (qs.url) {
						qs.resubmit = this.getNodeParameter('resubmit', i);
					}

					responseData = await redditApiRequest.call(this, 'POST', 'api/submit', qs);

				}

				// ----------------------------------
				//         post: getAll
				// ----------------------------------

				else if (operation === 'getAll') {

					// https://www.reddit.com/dev/api/#GET_hot
					// https://www.reddit.com/dev/api/#GET_new
					// https://www.reddit.com/dev/api/#GET_rising
					// https://www.reddit.com/dev/api/#GET_{sort}

					const subreddit = this.getNodeParameter('subreddit', i);
					const content = this.getNodeParameter('content', i);
					const endpoint = `r/${subreddit}/${content}.json`;

					responseData = await handleListing.call(this, i, endpoint);

				}

			// *********************************************************************
			// 															  user
			// *********************************************************************

			} else if (resource === 'user') {

				// ----------------------------------
				//           user: get
				// ----------------------------------

				if (operation === 'get') {

					// https://www.reddit.com/dev/api/#GET_user_{username}_{where}

					const username = this.getNodeParameter('username', i) as string;
					const details = this.getNodeParameter('details', i) as string;
					const endpoint = `user/${username}/${details}.json`;

					responseData = ['about', 'gilded'].includes(details)
						? await redditApiRequest.call(this, 'GET', endpoint, {})
						: await handleListing.call(this, i, endpoint);

					if (details === 'about') {
						responseData = responseData.data;
					}

				}

			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}