

You created this MySQL account:
```
'pet_shop_migration'@'%'
```
The problem is that MySQL uses `DROP USER`, not `DELETE USER`.
Run:
```
DROP USER 'pet_shop_migration'@'%';
```
You should receive:
```
Query OK, 0 rows affected
```
Then verify that it was removed:
```
SELECT User, Host
FROM mysql.user
WHERE User = 'pet_shop_migration';
```
If no rows are returned, the user has been deleted.
A safer version is:
```
DROP USER IF EXISTS 'pet_shop_migration'@'%';
```
This avoids an error when the account does not exist.
Then recreate it correctly with a password:
```
CREATE USER 'pet_shop_migration'@'%'
IDENTIFIED BY 'YOUR_STRONG_MIGRATION_PASSWORD';
```
After that, grant its migration permissions:
```
GRANT
    SELECT,
    INSERT,
    UPDATE,
    DELETE,
    CREATE,
    ALTER,
    DROP,
    INDEX,
    REFERENCES
ON pet_shop.*
TO 'pet_shop_migration'@'%';
```
Verify:
```
SHOW GRANTS FOR 'pet_shop_migration'@'%';
```
Your earlier command failed because this is invalid MySQL syntax:
```
DELETE USER ...
```
`DELETE` is used for deleting rows from tables. Database accounts are removed with:
```
DROP USER ...
```