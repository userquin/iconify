import type { RedundancyConfig } from '../src/config';
import { sendQuery } from '../src/query';

describe('Multiple resources', () => {
	it('Simple query, success on first attempt', (done) => {
		const payload = {};
		const resources = ['api1', 'api2'];
		const result = {};
		const config: RedundancyConfig = {
			resources,
			index: 0,
			timeout: 200,
			rotate: 100,
			random: false,
			dataAfterTimeout: false,
		};

		// Tracking
		let isSync = true;
		const startTime = Date.now();
		let sentQuery = 0;

		// Send query
		const getStatus = sendQuery(
			config,
			payload,
			(resource, queryPayload, queryItem) => {
				expect(isSync).toEqual(false);
				expect(resource).toEqual('api1');
				expect(queryPayload).toEqual(payload);

				// Query should be executed only once because it should finish before second attempt
				expect(sentQuery).toEqual(0);
				sentQuery++;

				// Check status
				expect(queryItem.getQueryStatus).toEqual(getStatus);
				const status = getStatus();
				expect(status.status).toEqual('pending');
				expect(status.payload).toEqual(payload);
				expect(status.queriesSent).toEqual(1);
				expect(status.queriesPending).toEqual(1);

				// Add abort function
				queryItem.abort = (): void => {
					done('Abort should have not been called');
				};

				// Complete
				queryItem.done(result);
			},
			(data, error) => {
				// Make sure query was sent
				expect(sentQuery).toEqual(1);

				// Validate data
				expect(data).toEqual(result);
				expect(error).toBeUndefined();

				// Check status
				const status = getStatus();
				expect(status.status).toEqual('completed');
				expect(status.queriesSent).toEqual(1);
				expect(status.queriesPending).toEqual(0);

				// Should be almost instant
				const diff = Date.now() - startTime;
				expect(diff).toBeLessThan(50);

				done();
			},
			() => {
				done('This should not have been called');
			}
		);

		// Check status
		const status = getStatus();
		expect(status.status).toEqual('pending');
		expect(status.queriesSent).toEqual(0);
		expect(status.queriesPending).toEqual(0);

		isSync = false;
	});

	it('Simple query, time out on first, success on second (~100ms)', (done) => {
		const payload = {};
		const resources = ['api1', 'api2'];
		const result = {};
		const config: RedundancyConfig = {
			resources,
			index: 0,
			timeout: 200,
			rotate: 100,
			random: false,
			dataAfterTimeout: false,
		};

		// Tracking
		let isSync = true;
		const startTime = Date.now();
		let sentQuery = 0;
		let itemAborted = false;
		let parentUpdated = false;

		// Send query
		const getStatus = sendQuery(
			config,
			payload,
			(resource, queryPayload, queryItem) => {
				expect(isSync).toEqual(false);
				expect(queryPayload).toEqual(payload);

				// Query should be executed twice
				expect(sentQuery).toBeLessThan(2);
				expect(resource).toEqual(resources[sentQuery]);

				// Check status
				expect(queryItem.getQueryStatus).toEqual(getStatus);
				const status = getStatus();
				expect(status.status).toEqual('pending');
				expect(status.payload).toEqual(payload);

				// Bump counter
				sentQuery++;

				// All queries should be pending
				expect(status.queriesSent).toEqual(sentQuery);
				expect(status.queriesPending).toEqual(sentQuery);

				// Add abort function
				// Time out first, complete second
				switch (sentQuery) {
					case 1:
						queryItem.abort = (): void => {
							// First item should be aborted, but only once
							expect(itemAborted).toEqual(false);

							// When this is executed, counter should have been increased
							expect(sentQuery).toEqual(2);
							itemAborted = true;

							// Do nothing, let it time out
						};
						return;

					case 2:
						queryItem.abort = (): void => {
							done('Abort should have not been called');
						};

						// Send result
						queryItem.done(result);
						return;

					default:
						done('This code should not have been reached');
				}
			},
			(data, error) => {
				// Make sure queries were sent
				expect(sentQuery).toEqual(2);

				// First query should have been aborted
				expect(itemAborted).toEqual(true);

				// Validate data
				expect(data).toEqual(result);
				expect(error).toBeUndefined();

				// Check status
				const status = getStatus();
				expect(status.status).toEqual('completed');
				expect(status.queriesSent).toEqual(2);
				expect(status.queriesPending).toEqual(0);

				// Parent should have been updated
				expect(parentUpdated).toEqual(true);

				// Delay between first and second queries
				const diff = Date.now() - startTime;
				expect(diff).toBeGreaterThan(50);
				expect(diff).toBeLessThan(150);

				done();
			},
			(newIndex) => {
				// Start index should be updated to 1
				expect(newIndex).toEqual(1);
				parentUpdated = true;
			}
		);

		// Check status
		const status = getStatus();
		expect(status.status).toEqual('pending');
		expect(status.queriesSent).toEqual(0);
		expect(status.queriesPending).toEqual(0);

		isSync = false;
	});

	it('Time out all queries (~100ms)', (done) => {
		const payload = {};
		const resources = ['api1', 'api2'];
		const config: RedundancyConfig = {
			resources,
			index: 0,
			timeout: 50,
			rotate: 25,
			random: false,
			dataAfterTimeout: false,
		};

		// Tracking
		let isSync = true;
		const startTime = Date.now();
		let sentQuery = 0;
		let item1Aborted = false;
		let item2Aborted = false;

		// Send query
		const getStatus = sendQuery(
			config,
			payload,
			(resource, queryPayload, queryItem) => {
				expect(isSync).toEqual(false);
				expect(queryPayload).toEqual(payload);

				// Query should be executed twice
				expect(sentQuery).toBeLessThan(2);
				expect(resource).toEqual(resources[sentQuery]);

				// Check status
				expect(queryItem.getQueryStatus).toEqual(getStatus);
				const status = getStatus();
				expect(status.status).toEqual('pending');
				expect(status.payload).toEqual(payload);

				// Bump counter
				sentQuery++;

				// All queries should be pending
				expect(status.queriesSent).toEqual(sentQuery);
				expect(status.queriesPending).toEqual(sentQuery);

				// Add abort functions
				switch (sentQuery) {
					case 1:
						queryItem.abort = (): void => {
							expect(item1Aborted).toEqual(false);
							expect(item2Aborted).toEqual(false);

							// This should have been executed at the end
							expect(sentQuery).toEqual(2);
							item1Aborted = true;

							// Do not send anything
						};
						return;

					case 2:
						queryItem.abort = (): void => {
							expect(item1Aborted).toEqual(true);
							expect(item2Aborted).toEqual(false);

							// This should have been executed at the end
							expect(sentQuery).toEqual(2);
							item2Aborted = true;

							// Do not send anything
						};
						return;

					default:
						done('This code should not have been reached');
				}
			},
			(data, error) => {
				// Make sure queries were sent
				expect(sentQuery).toEqual(2);

				// Queries should have been aborted
				expect(item1Aborted).toEqual(true);
				expect(item2Aborted).toEqual(true);

				// Validate data
				expect(data).toBeUndefined();
				expect(error).toBeUndefined();

				// Check status
				const status = getStatus();
				expect(status.status).toEqual('failed');
				expect(status.queriesSent).toEqual(2);
				expect(status.queriesPending).toEqual(0);

				// rotate * 2 + timeout
				const diff = Date.now() - startTime;
				expect(diff).toBeGreaterThan(90);
				expect(diff).toBeLessThan(120);

				done();
			},
			() => {
				done('This should have never been called');
			}
		);

		// Check status
		const status = getStatus();
		expect(status.status).toEqual('pending');
		expect(status.queriesSent).toEqual(0);
		expect(status.queriesPending).toEqual(0);

		isSync = false;
	});

	it('Start with second resource (~100ms)', (done) => {
		const payload = {};
		const resources = ['api1', 'api2'];
		const config: RedundancyConfig = {
			resources,
			index: 1,
			timeout: 50,
			rotate: 25,
			random: false,
			dataAfterTimeout: false,
		};

		// Tracking
		let isSync = true;
		const startTime = Date.now();
		let sentQuery = 0;
		let item1Aborted = false;
		let item2Aborted = false;

		// Send query
		const getStatus = sendQuery(
			config,
			payload,
			(resource, queryPayload, queryItem) => {
				expect(isSync).toEqual(false);
				expect(queryPayload).toEqual(payload);

				// Resource order should be: 1, 0
				expect(resource).not.toEqual(resources[sentQuery]);
				expect(resource).toEqual(resources[1 - sentQuery]);

				// Bump counter
				sentQuery++;

				// Add abort functions
				switch (sentQuery) {
					case 1:
						queryItem.abort = (): void => {
							item1Aborted = true;
						};
						return;

					case 2:
						queryItem.abort = (): void => {
							item2Aborted = true;
						};
						return;

					default:
						done('This code should not have been reached');
				}
			},
			(data, error) => {
				// Make sure queries were sent
				expect(sentQuery).toEqual(2);

				// Queries should have been aborted
				expect(item1Aborted).toEqual(true);
				expect(item2Aborted).toEqual(true);

				// Validate data
				expect(data).toBeUndefined();
				expect(error).toBeUndefined();

				// rotate * 2 + timeout
				const diff = Date.now() - startTime;
				expect(diff).toBeGreaterThan(90);
				expect(diff).toBeLessThan(120);

				done();
			},
			() => {
				done('This should have never been called');
			}
		);

		// Check status
		const status = getStatus();
		expect(status.status).toEqual('pending');
		expect(status.queriesSent).toEqual(0);
		expect(status.queriesPending).toEqual(0);

		isSync = false;
	});

	it('Start with last resource (~150ms)', (done) => {
		const payload = {};
		const resources = ['api1', 'api2', 'api3', 'api4'];
		const config: RedundancyConfig = {
			resources,
			index: 3,
			timeout: 50,
			rotate: 25,
			random: false,
			dataAfterTimeout: false,
		};

		// Tracking
		let isSync = true;
		let sentQuery = 0;
		const startTime = Date.now();

		// Send query
		const getStatus = sendQuery(
			config,
			payload,
			(resource, queryPayload) => {
				expect(isSync).toEqual(false);
				expect(queryPayload).toEqual(payload);

				// Resource order should be: 3, 0, 1, 2
				expect(resource).not.toEqual(resources[sentQuery]);

				const expectedIndex = sentQuery === 0 ? 3 : sentQuery - 1;
				expect(resource).toEqual(resources[expectedIndex]);

				// Bump counter
				sentQuery++;
			},
			(data, error) => {
				// Make sure queries were sent
				expect(sentQuery).toEqual(4);

				// Validate data
				expect(data).toBeUndefined();
				expect(error).toBeUndefined();

				// rotate * 4 + timeout
				const diff = Date.now() - startTime;
				expect(diff).toBeGreaterThan(140);
				expect(diff).toBeLessThan(170);

				done();
			},
			() => {
				done('This should have never been called');
			}
		);

		// Check status
		const status = getStatus();
		expect(status.status).toEqual('pending');
		expect(status.queriesSent).toEqual(0);
		expect(status.queriesPending).toEqual(0);

		isSync = false;
	});
});
