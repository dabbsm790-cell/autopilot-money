exports.handler = async (event) => {
  const { email } = JSON.parse(event.body);
  const res = await fetch('https://api.beehiiv.com/v2/publications/pub_d75652c0-d6f8-4fdd-a997-6fb3d1101edd/subscriptions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ohnQ1Hpua93FApCBrnkd7jrKomrokG1nLQleykovgEFkYNwxeLXX8tsn7FLOExYx'
    },
    body: JSON.stringify({ email, reactivate_existing: false, send_welcome_email: true })
  });
  return { statusCode: 200, body: JSON.stringify({ ok: res.ok }) };
};
