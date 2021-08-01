# Before starting the data processor

Before starting the data processor you need to make sure that all the required tables
were created and initialized. To do that we need to run the `db_access`'s diesel migrations.

First of all, if you don't already have the diesel cli installed, execute the following:

`cargo install diesel_cli --no-default-features --features postgres`

Once the diesel cli is installed, navigate to the db_access directory using your favorite shell.

If this is the first time you are setting up the database, execute the following:

`diesel migration run`

Otherwise use the following to make sure the database's structure is up to date:

`diesel migration redo`


# Starting the data processor

To start the data processor navigate to the data processor's directory using your favorite shell
and execute the following:

`cargo run`

Now the data processor should start and open the shell for you.


If you want to run the data processor in release mode use:

`cargo run --release`

# Commands

To see a list of available commands type `help` in the shell.
To execute a command simply type it in the shell and press enter.

You will usually only want to use the `reload all` command, which does all required operations
for reloading and recalculating everything in the correct order. 

Sometime's you will want to run some specific operations rather than using `reload all`. In that case, note that the order of operations is important for them to work properly. The `reload all` command executes the requires operations in the following order: `load laptops`, `load categories`, `calculate scores`. Each operation is dependent on the operations that were executed before it. You can use `reload all` at any point to fix any problems that were caused by executing commands.

# Exiting the shell

To exit the shell, simple type `exit` and press enter.