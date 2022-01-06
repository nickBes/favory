/*  
    Disable the ability to create tables inside the public 
    schema on the default role.
*/
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

/* 
    Disable the ability to do anything inside the favory DB,
    on the default role.
*/
REVOKE ALL ON DATABASE favory FROM PUBLIC;


-- Create roles:
CREATE ROLE favory_default;
CREATE ROLE favory_readonly;
CREATE ROLE favory_readwrite;

-- default permissions
GRANT CONNECT ON DATABASE favory TO favory_default;
GRANT USAGE ON SCHEMA public TO favory_default;

GRANT favory_default TO favory_readonly;
GRANT favory_default TO favory_readwrite;

-- readonly permissions
GRANT SELECT ON category, laptop, laptop_image, laptop_score_in_category, price_limits TO favory_readonly;

-- readwrite permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO favory_readwrite;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO favory_readwrite;

/*
    will update automatically the permissions of the readwrite
    role when new tables/sequences are created.
*/
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO favory_readwrite;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO favory_readwrite;