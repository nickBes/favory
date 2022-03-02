# SSL setup
Follow [this](https://gist.github.com/kocisov/2a9567eb51b83dfef48efce02ef3ab06) guide in order to implement SSL.
# SQL users setup
1. Inside the favory cloned folder, login into the postgres super user.
2. Connect to the favory DB:
    ```bash
    \c favory
    ```
3. Execute the next command to create favory_readonly and favory_readwrite roles:
    ```bash
    \i ./production/roles.sql
    ```
4. Create users for the available roles. Here some examples:
    > A user for the selector:
    ```sql
    CREATE USER selector WITH PASSWORD 'secret_passwd';
    GRANT favory_readonly TO selector;
    ``` 
    > A user for the data_processor:
    ```sql
    CREATE USER data_processor WITH PASSWORD 'secret_passwd';
    GRANT favory_readwrite TO data_processor;
    ```
5. Update your `DATABASE_URL` in each app: `postgres://postgress:username:passwd@localhost/favory`.
# Starting the server
1. Go to the production directory:
	```bash
	cd ./production/
	```
2. Build the project:
	```bash
	./build.sh
	```
3. Run the server:
	```bash
	./run.sh
	```
> You might want stop the server using:
	```bash
	./cleanup.sh
	```
