using MechanicShop.Api.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Serilog;

namespace Microsoft.AspNetCore.Builder;

public static class MiddlewareExtensions
{
    public static WebApplication UseCoreMiddlewares(this WebApplication app, IConfiguration configuration)
    {
        app.UseExceptionHandler();
        app.UseStatusCodePages();
        app.UseForwardedHeaders();
        app.UseHttpsRedirection();


        if (!app.Environment.IsDevelopment())
        {
            app.UseHsts();
        }

        app.UseDefaultFiles();
        app.UseStaticFiles();

        app.UseMiddleware<RequestLogContextMiddleware>();
        app.UseSerilogRequestLogging();

        app.UseCors(configuration["AppSettings:CorsPolicyName"]!);
        app.UseRateLimiter();
        app.UseAuthentication();
        app.UseAuthorization();

        return app;
    }
}
