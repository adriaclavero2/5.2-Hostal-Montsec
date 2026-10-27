package cat.montsec.hostal.cms.service;

import cat.montsec.hostal.cms.model.SiteConfig;
import cat.montsec.hostal.cms.repository.SiteConfigRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SiteConfigService {

    private final SiteConfigRepository siteConfigRepository;

    @PostConstruct
    public void initDefaultConfigs() {
        if (siteConfigRepository.count() == 0) {
            // HERO
            siteConfigRepository.save(new SiteConfig(null, "HERO_TITLE", "Benvinguts a Hostal Montsec"));
            siteConfigRepository.save(new SiteConfig(null, "HERO_SUBTITLE", "Desconnecta a la natura. Respira la pau del Montsec."));

            // HISTÒRIA
            siteConfigRepository.save(new SiteConfig(null, "HISTORY_TITLE", "La Nostra Història"));
            siteConfigRepository.save(new SiteConfig(null, "HISTORY_SUBTITLE", "Una masia familiar restaurada amb amor, on la tradició i la natura s'abracen."));
            siteConfigRepository.save(new SiteConfig(null, "HISTORY_P1", "Des de fa més de 50 anys, l'Hostal Montsec ha estat un refugi per a viatgers i amants de la natura. Situats al cor de la serra del Montsec, oferim una gastronomia basada en productes de proximitat (Km 0) i receptes passades de generació en generació."));
            siteConfigRepository.save(new SiteConfig(null, "HISTORY_P2", "El nostre objectiu és que et sentis com a casa, gaudint d'un entorn privilegiat, sota un dels cels nocturns més nets del món (Reserva Starlight)."));

            // MENÚS (Títols, Preus i Descripcions)
            siteConfigRepository.save(new SiteConfig(null, "MENU_MAIN_TITLE", "Els Nostres Menús"));
            siteConfigRepository.save(new SiteConfig(null, "PRICE_MENU_DIARI", "18,50 €"));
            siteConfigRepository.save(new SiteConfig(null, "DESC_MENU_DIARI", "Ideal per a fer una pausa en el teu camí. Plats casolans amb ingredients frescos i de temporada."));
            siteConfigRepository.save(new SiteConfig(null, "PRICE_MENU_CAP_SETMANA", "28,00 €"));
            siteConfigRepository.save(new SiteConfig(null, "DESC_MENU_CAP_SETMANA", "Gaudeix del cap de setmana amb les nostres especialitats a la brasa de llenya d'alzina."));
            siteConfigRepository.save(new SiteConfig(null, "PRICE_MENU_DEGUSTACIO", "45,00 €"));
            siteConfigRepository.save(new SiteConfig(null, "DESC_MENU_DEGUSTACIO", "L'experiència gastronòmica definitiva. Un viatge pels sabors més selectes de la nostra terra."));

            // INSTAGRAM
            siteConfigRepository.save(new SiteConfig(null, "IG_TITLE", "Segueix-nos a Instagram @HostalMontsec"));
            siteConfigRepository.save(new SiteConfig(null, "IG_IMG_1", "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80"));
            siteConfigRepository.save(new SiteConfig(null, "IG_IMG_2", "https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=600&q=80"));
            siteConfigRepository.save(new SiteConfig(null, "IG_IMG_3", "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&q=80"));
            siteConfigRepository.save(new SiteConfig(null, "IG_IMG_4", "https://images.unsplash.com/photo-1513442542250-854d436a73f2?w=600&q=80"));
        }
    }

    @Cacheable("cms")
    public Map<String, String> getAllConfigs() {
        List<SiteConfig> configs = siteConfigRepository.findAll();
        Map<String, String> configMap = new HashMap<>();
        for (SiteConfig config : configs) {
            configMap.put(config.getConfigKey(), config.getConfigValue());
        }
        return configMap;
    }

    @CacheEvict(value = "cms", allEntries = true)
    public void updateConfigs(Map<String, String> newConfigs) {
        newConfigs.forEach((key, value) -> {
            SiteConfig config = siteConfigRepository.findByConfigKey(key)
                    .orElse(new SiteConfig(null, key, ""));
            config.setConfigValue(value);
            siteConfigRepository.save(config);
        });
    }
}