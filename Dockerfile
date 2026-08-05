FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY backend/AlfaDiagnostic.csproj backend/
RUN dotnet restore backend/AlfaDiagnostic.csproj
COPY backend/ backend/
RUN dotnet publish backend/AlfaDiagnostic.csproj -c Release -o /out /p:UseAppHost=false
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /out .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "AlfaDiagnostic.dll"]
