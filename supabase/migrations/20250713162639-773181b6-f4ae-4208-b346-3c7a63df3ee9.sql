-- Delete duplicate clinical documents, keeping the most recent ones
DELETE FROM clinical_documents 
WHERE id IN (
  -- Client History duplicates (keep most recent)
  '6fb119e0-afb2-48ca-83eb-aef9ae4eed1a',
  'c30fdaa1-7602-4616-91c2-575536dabff8', 
  'a0860f83-7686-4486-8c6a-cc824efeec4b',
  'bfabb868-aefb-498b-8199-02dcc895ce43',
  'ffd5867d-ab9c-44db-ac96-dfb7682dcb59',
  '40c423c2-be5a-4ec0-9562-aa9bb36e4433',
  
  -- Informed Consent duplicates (keep most recent)
  '999c9bcf-00a6-4f40-8e26-cad3522b13c8',
  '5908b367-b139-4999-85ba-70789509bfc8',
  'd4da30d3-8a20-4ea1-81e4-d6e88cc0936f',
  
  -- Session Note duplicates (keep most recent)
  '4359c3b9-174e-4cd2-bda7-43b2abb8e9ba',
  'ba532e36-0c52-4c7c-9818-e9676401d806'
);