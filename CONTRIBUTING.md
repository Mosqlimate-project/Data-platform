## Pre-requisites
#### OS: 
- Linux x64

#### Programs:
- [Docker Engine](https://docs.docker.com/engine/)
- [Conda](https://docs.conda.io/en/latest/) or related
    

## Pre-build
### Generate your Github Client ID and Secret
Go to [New Github App](https://github.com/settings/applications/new) configuration and register the OAuth application as follows:
![Gitbhub SSO form](https://i.imgur.com/oxjPdYE.png)

After registering the app, you will see the brand-new app configuration. In this page you will find the **Cliend ID** and a button to generate a new **client secret**. Both will be used to generate the environment file of the project.
![ID & Key](https://i.imgur.com/fUvvIGi.png)
### Prepare Mosqlimate repository
If you haven't done yet, clone this repository in your project's directory:
```sh
mkdir /tmp/Mosqlimate && cd "$_"
git clone git@github.com:Mosqlimate-project/Data-platform.git && cd Data-platform
```
### Install dependencies
Mosqlimate uses [conda-forge](https://conda-forge.org/) and [poetry](https://python-poetry.org/) to manage it's dependencies. To prepare the base environment run with your manager (in this example I'm using [micromamba](https://mamba.readthedocs.io/en/latest/user_guide/micromamba.html)):
```sh
micromamba create -c conda-forge -f conda/base.yaml -y
micromamba activate mosqlimate
```
With the virtual environment activate, we can proceed with the Poetry installation:
```
poetry install
```
### Environment configuration
Mosqlimate uses [makim](https://github.com/osl-incubator/makim) as the CLI tool to run project commands, running the command `makim dev.dotenv` will run the scripts to generate the `.env` file behind the scenes. Mostly of the variables come with a default value that can later be changed as the contributor needs, some of the values, as [Github credentials](#generate-your-github-client-id-and-secret) for instance, will be left blank if not passed in during the configuration.

```sh
makim dev.dotenv
```

After the process, it will create a `.env` file at the root of the project with the similar config:
```sh
cat .env

Output:
# [Django Core]
ENV=dev
SECRET_KEY="0zs+q%9pv_3s$qz+a^1t52i=l=2k&$un+)7q(j6-r&o=xfh(b6"
ALLOWED_HOSTS="*"
DJANGO_SETTINGS_MODULE=mosqlimate.settings.dev

# [Django Image]
HOST_UID=1000
HOST_GID=1000
DJANGO_HOST_DATA_PATH=/tmp/Mosqlimate/storage/django
DJANGO_CONTAINER_DATA_PATH=/opt/services/storage/django

# [Django OAuth]
SITE_DOMAIN=0.0.0.0:8042
SITE_NAME=localhost
GITHUB_CLIENT_ID=16687d2618b248cc546d
GITHUB_SECRET=ea2284db0a4194102e5a08d17f9d030c0ee9d006

# [Django PostgreSQL]
DATABASE_URL=postgresql://mosqlimate-dev:mosqlimate-dev@postgres:5432/mosqlimate-dev
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=mosqlimate-dev
POSTGRES_PASSWORD=mosqlimate-dev
POSTGRES_DB=mosqlimate-dev

# [Postgres Image]
POSTGRES_HOST_UID=1000
POSTGRES_HOST_GID=1000
POSTGRES_DATA_DIR_HOST=/tmp/Mosqlimate/data/psql/pgdata
POSTGRES_CONF_DIR_HOST=/tmp/Mosqlimate/data/psql
...
```
Note that executing the command with a former `.env` in the path, it will ask to override this `.env` at the end of the process. Please make sure any critical information is properly saved before finishing the `makim env.dotenv` command. 

### PostgreSQL configuration
In order to run the Django Application, it will require a PostgreSQL container that's already configured in the project. To generate it's `postgresql.conf` config file, run: 
```sh
makim dev.psql-conf
```
The postgresql template will search into your `.env` vars and fill the configuration with the properly values, generating a `postgresq.conf` file at your `POSTGRES_CONF_DIR_HOST` directory. Feel free to modify them as your needs, note that some of them will be later used to communicate with other docker containers.

## Build & Deploy
To build the containers, simply run:
```sh
makim docker.build
```
It should appear something like this when you list the Docker images:
```sh
docker images

Output:
REPOSITORY            TAG       IMAGE ID       CREATED          SIZE
mosqlimate_django     latest    36f33a879b50   49 minutes ago   1.74GB
mosqlimate_postgres   latest    82054f202034   52 minutes ago   601MB

```
Now start the containers with the command:
```
makim docker.start
```
```
sugar ps

Output:
sugar ps
        Name                       Command                  State                        Ports
----------------------------------------------------------------------------------------------------------------
mosqlimate_django_1     tini -- /opt/entrypoint.sh ...   Up (healthy)   0.0.0.0:8042->8042/tcp,:::8042->8042/tcp
mosqlimate_postgres_1   docker-entrypoint.sh -p 5432     Up (healthy)   0.0.0.0:5432->5432/tcp,:::5432->5432/tcp
```

## Post-build
### Migrations
After starting the containers up, you are able to run the migrations to create the objects on PostgreSQL:
```sh
makim django.migrations
```

### Check Site ID
At this point, the server is ready to run in a development environment. But there are some topics to be ensured first. Firstly, it will be required to check in which Site Django will be running on, this is important to properly configure Github OAuth:
```py
makim django.dbshell
```
```
psql (15.3)
Type "help" for help.

mosqlimate-dev=# select * from django_site;
 id |   domain    |    name     
----+-------------+-------------
  2 | example.com | example.com
  ```

This domain ID (2) will have to match the `SITE_ID` on `settings.base` configuration. E.g: `SITE_ID = 2`

### Create Super User
To access `/admin/` page, it will be required a superuser. To do that, simply type the code below and follow the instructions:
```sh
makim django.createsuperuser --email "a@a.com" --username "admin"
makim django.changepassword --username admin
```
```
Running: python manage.py changepassword admin
Changing password for user 'admin'
Password:
Password (again):
Password changed successfully for user 'admin'
```
After successfully creating the superuser, you can access the admin page on [0.0.0.0:8042/admin/](0.0.0.0:8042/admin/).

### Configuring Github SSO
Logged in with the superuser in the `/admin/` page, you will see `Social Apps` in the `Social Accounts` menu, we will create a new Social Account so the Users can authenticate via Github in the website:
 ![Github SSO](https://i.imgur.com/vmOEpyk.png)

Now we will modify in the [Sites](http://0.0.0.0:8042/admin/sites/site/) page, the Site `example.com` to match the URL of our development website:

![Site](https://i.imgur.com/dwJCVRd.png)
### Done
Following the steps above, you now should be able of logging off from the superuser account and logging in with your personal Github account (if it is email authenticated via Github).
