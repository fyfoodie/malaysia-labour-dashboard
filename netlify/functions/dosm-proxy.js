const fetch = require('node-fetch');

exports.handler = async (event) => {
  const id = event.queryStringParameters?.id;
  const limit = event.queryStringParameters?.limit ?? 500;

  if (!id) return { statusCode: 400, body: 'Missing id' };

  try {
    const url = `https://api.data.gov.my/data-catalogue?id=${id}&limit=${limit}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await res.json();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
};
