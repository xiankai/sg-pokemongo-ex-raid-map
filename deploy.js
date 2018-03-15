const { execSync } = require('child_process');
const ghpages = require('gh-pages');
const id = process.argv[2] || 'singapore';
execSync('rm -f .env.production .env.local.production');
execSync(`ln -s ${id}.env .env.production`);
execSync(
	'grep -e"CUSTOM_DOMAIN" .env.production | cut -f2 -d"=" > public/CNAME'
);
execSync(
	`echo "REACT_APP_VERSION=${new Date().getDate()} ${new Date()
		.toString()
		.slice(4, 7)}" > .env.local.production`
);
execSync(`yarn build`);

ghpages.publish(
	'build',
	{
		branch: id === 'singapore' ? 'gh-pages' : 'master',
		repo:
			id === 'singapore'
				? 'https://github.com/xiankai/sg-pokemongo-ex-raid-map'
				: `https://github.com/pokemongo-exraid-maps/${id}`,
		// message: ''
	},
	err => {
		if (err) {
			console.error(err);
		} else {
			execSync('rm .env.production .env.local.production public/CNAME');
			console.log(`Successfully deployed for ${id}`);
		}
	}
);
