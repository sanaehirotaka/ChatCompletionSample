using ChatCompletion.Lib.Injection;
using System.Reflection;

namespace ChatCompletion.Lib.Extensions;

public static class AutoConfigExtensions
{
    public static IServiceCollection AutoConfig(this IServiceCollection services, Assembly assembly)
    {
        foreach (Type type in assembly.GetExportedTypes().Where(type => !type.IsInterface && !type.IsAbstract))
        {
            if (type.GetCustomAttribute(typeof(InjectionTargetsAttribute), true) is InjectionTargetsAttribute attribute)
            {
                var implType = type;
                var serviceType = ((IList<Type>)[.. type.GetInterfaces(), type.BaseType!, type]).First(type => type.GetCustomAttribute(typeof(InjectionTargetsAttribute)) != null);
                services.Add(new(serviceType, implType, attribute.ServiceLifetime));
            }
        }
        return services;
    }
}
