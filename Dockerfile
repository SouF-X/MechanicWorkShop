FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build

WORKDIR /src

COPY MechanicShop.sln ./
COPY src/MechanicShop.Api/MechanicShop.Api.csproj src/MechanicShop.Api/
COPY src/MechanicShop.Application/MechanicShop.Application.csproj src/MechanicShop.Application/
COPY src/MechanicShop.Contracts/MechanicShop.Contracts.csproj src/MechanicShop.Contracts/
COPY src/MechanicShop.Domain/MechanicShop.Domain.csproj src/MechanicShop.Domain/
COPY src/MechanicShop.Infrastructure/MechanicShop.Infrastructure.csproj src/MechanicShop.Infrastructure/

RUN dotnet restore MechanicShop.sln

COPY . .

RUN dotnet publish src/MechanicShop.Api/MechanicShop.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "MechanicShop.Api.dll"]