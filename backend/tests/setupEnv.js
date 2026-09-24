process.env.NODE_ENV = 'test';
process.env.AUTH_RATE_LIMIT_MAX = '1000';
process.env.API_RATE_LIMIT_MAX = '10000';
process.env.ENABLE_CRON = 'false';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_with_more_than_32_chars__';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_with_more_than_32_chars_';
delete process.env.SEASON_START_YEAR;
