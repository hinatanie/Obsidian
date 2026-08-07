You are still getting the **same Lombok/JDK compatibility error**. The important detail is that `release 21` only tells Java to compile your code _for Java 21_; Maven could still be running with JDK 24 or another newer JDK.
This exact `TypeTag :: UNKNOWN` error has been reported when Lombok runs under JDK 24.
Run these commands:
```
java -version
.\mvnw.cmd -version
```
Look at the Java version shown by `.\mvnw.cmd -version`.
### If Maven shows Java 24 or newer
Find your JDK installations:
```
Get-ChildItem "C:\Program Files\Java"
```
Then temporarily switch Maven to JDK 21:
```
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\mvnw.cmd -version
.\mvnw.cmd clean package
```
Adjust the path if your JDK folder has a different name.
### Confirm which Lombok version Maven resolved
Run:
```
.\mvnw.cmd dependency:tree "-Dincludes=org.projectlombok:lombok"
```
Maven’s dependency tree shows the version actually selected for the build, which may differ from what you expected after editing `pom.xml`.
You should see something like:
```
org.projectlombok:lombok:jar:1.18.46:provided
```
Lombok’s current official download release is `1.18.46`.
Also check whether Lombok appears inside the compiler plugin:
```
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <annotationProcessorPaths>
            <path>
                <groupId>org.projectlombok</groupId>
                <artifactId>lombok</artifactId>
                <version>1.18.46</version>
            </path>
        </annotationProcessorPaths>
    </configuration>
</plugin>
```
If an older version is specified there, update it too. A version in `<annotationProcessorPaths>` can remain old even after you update the normal dependency.
Then force Maven to refresh dependencies:
```
Remove-Item "$env:USERPROFILE\.m2\repository\org\projectlombok\lombok" -Recurse -Force
.\mvnw.cmd clean package -U
```
The most useful outputs now are:
```
.\mvnw.cmd -version
.\mvnw.cmd dependency:tree "-Dincludes=org.projectlombok:lombok"
```
Those will reveal whether Maven is using JDK 24 or is still resolving an older Lombok version.