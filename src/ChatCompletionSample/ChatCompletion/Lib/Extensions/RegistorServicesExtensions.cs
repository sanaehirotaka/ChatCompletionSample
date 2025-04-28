namespace ChatCompletion.Lib.Extensions;

public static class RegistorServicesExtensions
{
    public static IServiceCollection RegistorServices(this IServiceCollection services)
    {
        return services.AutoConfig(typeof(RegistorServicesExtensions).Assembly);
    }
}
