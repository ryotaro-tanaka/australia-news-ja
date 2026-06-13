#!/bin/bash

# KV Namespace ID (From wrangler.toml)
NAMESPACE_ID="5153c3cb172e445bb293d258ad1d4a0f"

echo "Listing keys with prefix 'ja:id:'..."
# jq is required to parse the output
KEYS=$(wrangler kv key list --namespace-id $NAMESPACE_ID --prefix "ja:id:" --remote | jq -r '.[].name')

if [ -z "$KEYS" ] || [ "$KEYS" == "null" ]; then
    echo "No keys found with prefix 'ja:id:'."
else
    echo "Deleting individual article keys in parallel..."
    for KEY in $KEYS; do
        echo "Deleting $KEY..."
        wrangler kv key delete --namespace-id $NAMESPACE_ID "$KEY" --remote &
    done
    # Wait for all background processes to complete
    wait
fi

echo "Deleting sys:latest-news..."
wrangler kv key delete --namespace-id $NAMESPACE_ID "sys:latest-news" --remote

echo "Cleanup complete."
