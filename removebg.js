import fetch, { FormData, fileFromSync } from 'node-fetch';

async function removebg(filePath) {
  try {
  const form = new FormData();
  form.append('image', fileFromSync(filePath));  

  // 2. POST to the correct “file” endpoint (not “file/url”), omitting manual content‑type
  const res = await fetch(
    'https://api.apyhub.com/processor/image/remove-background/file/url?output=response.png',
    {
      method: 'POST',
      headers: {
        'apy-token': 'APY0ddhKXXQXTMfezkvhKO9xBYf0P7dgCm0xxTLWSn2KTZe7MzV5pYA63WKnTL50GoZZ'
      },
      body: form
    }
  );
  if (!res.ok) throw new Error(`Background removal failed: ${res.status} ${res.statusText}`);
  let response = await res.json();
  return response.data
  } catch (e) {
    throw e
  }
}

export default removebg