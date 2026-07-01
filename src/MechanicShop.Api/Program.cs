using MechanicShop.Infrastructure.Identity;
using Scalar.AspNetCore;
using Serilog;
using MechanicShop.Infrastructure.RealTime;
using MechanicShop.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddPresentation(builder.Configuration)
    .AddApplication()
    .AddInfrastructure(builder.Configuration);

builder.Host.UseSerilog((context, loggerConfig) => loggerConfig.ReadFrom.Configuration(context.Configuration));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{

    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    await dbContext.Database.MigrateAsync();

    var bootstrapper = scope.ServiceProvider.GetRequiredService<FirstManagerBootstrapper>();

    var result = await bootstrapper.InitialiseAsync();

    if (result.IsError)
    {
        throw new InvalidOperationException(result.TopError.Description);
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "MechanicShop API V1");

        options.EnableDeepLinking();
        options.DisplayRequestDuration();
        options.EnableFilter();
    });

    app.MapScalarApiReference();
}

app.UseCoreMiddlewares(builder.Configuration);

app.MapControllers();

app.MapPrometheusScrapingEndpoint();

app.MapHub<WorkOrderHub>("/hubs/workorders");

app.Run();
